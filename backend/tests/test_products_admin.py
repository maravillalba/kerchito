import pytest
from sqlalchemy.exc import IntegrityError

import uploads
from models import Order, OrderItem, Product

NUEVO = {
    "brand": "Marolio",
    "name": "Aceite",
    "unit": "900 ml",
    "category": "almacen",
    "price": 2100,
    "stock": 10,
    "cost": 1300,
    "description": "Aceite de girasol",
}

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
JPG = b"\xff\xd8\xff\xe0" + b"0" * 32
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"0" * 32


@pytest.fixture()
def producto(db_session):
    item = Product(
        id=1, brand="Coca-Cola", name="Original", unit="500 ml", category="bebidas",
        price=1200, stock=25, cost=700,
    )
    db_session.add(item)
    db_session.commit()
    return item


def subir(client, headers, contenido=PNG, nombre="foto.png", tipo="image/png", product_id=1):
    return client.post(
        f"/api/products/{product_id}/image",
        headers=headers,
        files={"file": (nombre, contenido, tipo)},
    )


# --- Permisos ---------------------------------------------------------------------

RUTAS_DE_ADMIN = [
    ("post", "/api/products"),
    ("put", "/api/products/1"),
    ("delete", "/api/products/1"),
    ("patch", "/api/products/1/stock"),
    ("post", "/api/products/1/image"),
    ("get", "/api/admin/products"),
]


@pytest.mark.parametrize("metodo, ruta", RUTAS_DE_ADMIN)
def test_sin_sesion_devuelve_401(client, producto, metodo, ruta):
    assert getattr(client, metodo)(ruta).status_code == 401


@pytest.mark.parametrize("metodo, ruta", RUTAS_DE_ADMIN)
def test_un_cliente_recibe_403(client, producto, customer_headers, metodo, ruta):
    assert getattr(client, metodo)(ruta, headers=customer_headers).status_code == 403


# --- El costo es privado ----------------------------------------------------------


def test_los_endpoints_publicos_no_muestran_el_costo(client, producto):
    assert "cost" not in client.get("/api/products/1").json()
    assert "cost" not in client.get("/api/products").json()[0]


def test_el_admin_ve_el_costo(client, producto, admin_headers):
    [item] = client.get("/api/admin/products", headers=admin_headers).json()
    assert item["cost"] == 700


def test_la_base_rechaza_un_costo_negativo(db_session):
    db_session.add(
        Product(brand="A", name="B", unit="C", category="bebidas", price=1, stock=1, cost=-1)
    )
    with pytest.raises(IntegrityError):
        db_session.commit()


# --- Crear y editar ---------------------------------------------------------------


def test_crear_producto(client, admin_headers):
    respuesta = client.post("/api/products", json=NUEVO, headers=admin_headers)
    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["cost"] == 1300
    assert cuerpo["image"] is None
    assert client.get(f"/api/products/{cuerpo['id']}").json()["brand"] == "Marolio"


@pytest.mark.parametrize(
    "cambio",
    [
        {"cost": -1},
        {"cost": None},
        {"price": 0},
        {"stock": -1},
        {"brand": "  "},
        {"category": "xyz"},
        {"offer_price": 2100},
    ],
    ids=["costo-negativo", "sin-costo", "precio-cero", "stock-negativo", "marca", "categoria", "oferta"],
)
def test_crear_con_datos_invalidos_devuelve_422(client, db_session, admin_headers, cambio):
    respuesta = client.post("/api/products", json={**NUEVO, **cambio}, headers=admin_headers)
    assert respuesta.status_code == 422
    assert db_session.query(Product).count() == 0


def test_crear_ignora_el_image_del_cuerpo(client, admin_headers):
    respuesta = client.post(
        "/api/products", json={**NUEVO, "image": "/uploads/products/ajeno.png"}, headers=admin_headers
    )
    assert respuesta.json()["image"] is None


def test_editar_reemplaza_los_datos_y_conserva_la_foto(client, db_session, producto, admin_headers):
    producto.image = "/productos/coca-cola.webp"
    db_session.commit()
    respuesta = client.put(
        "/api/products/1", json={**NUEVO, "offer_price": 1900}, headers=admin_headers
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["brand"] == "Marolio"
    assert cuerpo["offer_price"] == 1900
    assert cuerpo["image"] == "/productos/coca-cola.webp"


def test_editar_puede_quitar_la_oferta(client, db_session, producto, admin_headers):
    producto.offer_price = 1000
    db_session.commit()
    respuesta = client.put("/api/products/1", json=NUEVO, headers=admin_headers)
    assert respuesta.json()["offer_price"] is None


def test_editar_producto_inexistente_devuelve_404(client, admin_headers):
    assert client.put("/api/products/99", json=NUEVO, headers=admin_headers).status_code == 404


def test_fijar_stock(client, producto, admin_headers):
    respuesta = client.patch("/api/products/1/stock", json={"stock": 7}, headers=admin_headers)
    assert respuesta.status_code == 200
    assert respuesta.json()["stock"] == 7
    assert client.get("/api/products/1").json()["stock"] == 7


def test_fijar_stock_negativo_devuelve_422(client, producto, admin_headers):
    respuesta = client.patch("/api/products/1/stock", json={"stock": -1}, headers=admin_headers)
    assert respuesta.status_code == 422


def test_fijar_stock_de_producto_inexistente_devuelve_404(client, admin_headers):
    respuesta = client.patch("/api/products/99/stock", json={"stock": 1}, headers=admin_headers)
    assert respuesta.status_code == 404


# --- Borrar -----------------------------------------------------------------------


def test_borrar_producto(client, producto, admin_headers):
    assert client.delete("/api/products/1", headers=admin_headers).status_code == 204
    assert client.get("/api/products/1").status_code == 404


def test_borrar_producto_inexistente_devuelve_404(client, admin_headers):
    assert client.delete("/api/products/99", headers=admin_headers).status_code == 404


def test_borrar_producto_que_esta_en_un_pedido_devuelve_409(
    client, db_session, producto, admin_headers, cliente
):
    db_session.add(
        Order(
            user_id=cliente.id,
            payment_method="efectivo",
            total=1200,
            items=[OrderItem(product_id=1, quantity=1, unit_price=1200, unit_cost=700)],
        )
    )
    db_session.commit()
    respuesta = client.delete("/api/products/1", headers=admin_headers)
    assert respuesta.status_code == 409
    assert "ya está en un pedido" in respuesta.json()["detail"]
    assert client.get("/api/products/1").status_code == 200


def test_borrar_producto_borra_su_foto_subida(client, producto, admin_headers, carpeta_de_fotos):
    subir(client, admin_headers)
    assert len(list(carpeta_de_fotos.iterdir())) == 1
    client.delete("/api/products/1", headers=admin_headers)
    assert list(carpeta_de_fotos.iterdir()) == []


# --- Foto -------------------------------------------------------------------------


@pytest.mark.parametrize(
    "contenido, extension", [(PNG, ".png"), (JPG, ".jpg"), (WEBP, ".webp")], ids=["png", "jpg", "webp"]
)
def test_subir_foto_valida(client, producto, admin_headers, carpeta_de_fotos, contenido, extension):
    respuesta = subir(client, admin_headers, contenido)
    assert respuesta.status_code == 200
    imagen = respuesta.json()["image"]
    assert imagen.startswith("/uploads/products/")
    assert imagen.endswith(extension)
    assert (carpeta_de_fotos / imagen.rsplit("/", 1)[1]).read_bytes() == contenido
    assert client.get("/api/products/1").json()["image"] == imagen


def test_el_nombre_guardado_no_usa_el_nombre_del_archivo(client, producto, admin_headers):
    respuesta = subir(client, admin_headers, nombre="../../../evil.png")
    nombre = respuesta.json()["image"].rsplit("/", 1)[1]
    assert "evil" not in nombre
    assert len(nombre) == len("0" * 32 + ".png")


@pytest.mark.parametrize(
    "contenido, nombre, tipo",
    [
        (b"<script>alert(1)</script>" * 4, "foto.png", "image/png"),
        (b"GIF89a" + b"0" * 32, "foto.gif", "image/gif"),
        (b"<svg xmlns='http://www.w3.org/2000/svg'/>", "foto.svg", "image/svg+xml"),
        (b"", "vacia.png", "image/png"),
        (b"RIFF\x24\x00\x00\x00WAVEfmt ", "audio.webp", "image/webp"),
    ],
    ids=["texto-disfrazado", "gif", "svg", "vacio", "riff-no-webp"],
)
def test_tipo_invalido_devuelve_415(
    client, producto, admin_headers, carpeta_de_fotos, contenido, nombre, tipo
):
    respuesta = subir(client, admin_headers, contenido, nombre, tipo)
    assert respuesta.status_code == 415
    assert client.get("/api/products/1").json()["image"] is None
    assert not carpeta_de_fotos.exists()


def test_archivo_de_mas_de_2_mb_devuelve_413(client, producto, admin_headers, carpeta_de_fotos):
    contenido = PNG + b"0" * (uploads.MAX_IMAGE_BYTES - len(PNG) + 1)
    respuesta = subir(client, admin_headers, contenido)
    assert respuesta.status_code == 413
    assert client.get("/api/products/1").json()["image"] is None
    assert not carpeta_de_fotos.exists()


def test_archivo_de_exactamente_2_mb_se_acepta(client, producto, admin_headers):
    contenido = PNG + b"0" * (uploads.MAX_IMAGE_BYTES - len(PNG))
    assert subir(client, admin_headers, contenido).status_code == 200


def test_foto_de_producto_inexistente_devuelve_404(client, admin_headers):
    assert subir(client, admin_headers, product_id=99).status_code == 404


def test_foto_sin_archivo_devuelve_422(client, producto, admin_headers):
    assert client.post("/api/products/1/image", headers=admin_headers).status_code == 422


def test_foto_sin_permiso_no_guarda_nada(client, producto, customer_headers, carpeta_de_fotos):
    assert subir(client, {}).status_code == 401
    assert subir(client, customer_headers).status_code == 403
    assert not carpeta_de_fotos.exists()


def test_reemplazar_foto_borra_la_subida_anterior(client, producto, admin_headers, carpeta_de_fotos):
    primera = subir(client, admin_headers).json()["image"]
    segunda = subir(client, admin_headers, JPG).json()["image"]
    assert primera != segunda
    assert [f.name for f in carpeta_de_fotos.iterdir()] == [segunda.rsplit("/", 1)[1]]


def test_reemplazar_nunca_borra_una_foto_del_seed(
    client, db_session, producto, admin_headers, monkeypatch
):
    producto.image = "/productos/coca-cola.webp"
    db_session.commit()
    borradas = []
    original = uploads.Path.unlink
    monkeypatch.setattr(
        uploads.Path, "unlink", lambda self, **kw: (borradas.append(self), original(self, **kw))[1]
    )
    assert subir(client, admin_headers).status_code == 200
    assert borradas == []


def test_delete_uploaded_image_no_sale_de_su_carpeta(tmp_path, carpeta_de_fotos):
    carpeta_de_fotos.mkdir()
    fuera = carpeta_de_fotos.parent / "secreto.txt"
    fuera.write_text("x")
    uploads.delete_uploaded_image("/uploads/products/../secreto.txt")
    assert fuera.exists()


def test_la_foto_subida_se_publica_en_uploads(client):
    # Este test usa la carpeta real porque StaticFiles se monta sobre ella.
    uploads.UPLOADS_ROOT.joinpath("products").mkdir(parents=True, exist_ok=True)
    archivo = uploads.UPLOADS_ROOT / "products" / "test-publicacion.png"
    archivo.write_bytes(PNG)
    try:
        respuesta = client.get("/uploads/products/test-publicacion.png")
        assert respuesta.status_code == 200
        assert respuesta.content == PNG
        assert respuesta.headers["content-type"] == "image/png"
    finally:
        archivo.unlink()
