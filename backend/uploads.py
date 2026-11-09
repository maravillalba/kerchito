"""Fotos de productos subidas por el admin."""

import uuid
from pathlib import Path

UPLOADS_ROOT = Path(__file__).with_name("uploads")
PRODUCT_IMAGES_DIR = UPLOADS_ROOT / "products"
PUBLIC_PREFIX = "/uploads/products/"
MAX_IMAGE_BYTES = 2 * 1024 * 1024


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
