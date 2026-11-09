"""Fotos de productos subidas por el admin."""

import re
import uuid
from pathlib import Path

from fastapi.responses import JSONResponse

UPLOADS_ROOT = Path(__file__).with_name("uploads")
PRODUCT_IMAGES_DIR = UPLOADS_ROOT / "products"
PUBLIC_PREFIX = "/uploads/products/"
MAX_IMAGE_BYTES = 2 * 1024 * 1024
TOO_LARGE_MESSAGE = "La foto no puede pesar más de 2 MB"
# Lo que ocupan los límites y encabezados del multipart, además del archivo. La
# medida exacta del archivo la controla el endpoint.
_MULTIPART_MARGIN_BYTES = 64 * 1024
_IMAGE_PATH = re.compile(r"^/api/products/\d+/image/?$")


class ImageUploadLimit:
    """Corta las fotos grandes por su Content-Length, antes de leer el cuerpo.

    FastAPI procesa todo el multipart antes de llamar al endpoint y a sus
    dependencias, así que sin esto cualquiera, aun sin sesión, podría hacer que el
    servidor reciba un archivo enorme. El servidor (uvicorn) no deja mandar más
    bytes que los declarados, y sin el header se rechaza.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (
            scope["type"] == "http"
            and scope["method"] == "POST"
            and _IMAGE_PATH.match(scope["path"])
        ):
            response = _reject_by_length(dict(scope["headers"]).get(b"content-length"))
            if response is not None:
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def _reject_by_length(header: bytes | None) -> JSONResponse | None:
    try:
        length = int(header) if header is not None else None
    except ValueError:
        length = None
    if length is None:
        return JSONResponse(
            status_code=411, content={"detail": "Falta el tamaño del archivo"}
        )
    if length > MAX_IMAGE_BYTES + _MULTIPART_MARGIN_BYTES:
        return JSONResponse(status_code=413, content={"detail": TOO_LARGE_MESSAGE})
    return None


def image_extension(content: bytes) -> str | None:
    """Extensión según los primeros bytes del archivo: su nombre y su tipo declarado
    los elige quien lo sube, así que no sirven para validar. None si no es válida."""
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None


def save_product_image(content: bytes, extension: str) -> str:
    """Guarda el archivo con un nombre UUID y devuelve su ruta pública."""
    PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    (PRODUCT_IMAGES_DIR / filename).write_bytes(content)
    return f"{PUBLIC_PREFIX}{filename}"


def delete_uploaded_image(public_path: str | None) -> None:
    """Borra una foto subida. Las del seed (/productos/...) no se tocan."""
    if public_path is None or not public_path.startswith(PUBLIC_PREFIX):
        return
    # .name descarta cualquier carpeta: nunca se borra algo fuera de PRODUCT_IMAGES_DIR.
    (PRODUCT_IMAGES_DIR / Path(public_path).name).unlink(missing_ok=True)
