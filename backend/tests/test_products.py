import pytest
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from models import Product
from schemas import ProductIn

CAMPOS_PRODUCTO = {
    "id",
    "brand",
    "name",
    "unit",
    "category",
    "price",
    "offer_price",
    "stock",
    "description",
    "image",
}


@pytest.fixture()
def productos(db_session):
    # Se insertan con ids desordenados para comprobar que la API ordena por id.
    datos = [
        Product(
            id=3,
            brand="La Serenísima",
            name="Leche entera",
            unit="1 L",
            category="lacteos",
            price=1300,
            stock=20,
        ),
        Product(
            id=1,
            brand="Coca-Cola",
            name="Original",
            unit="500 ml",
            category="bebidas",
            price=1200,
            offer_price=1000,
            stock=25,
            description="Gaseosa clásica",
            image="coca.png",
        ),
        Product(
            id=2,
            brand="Villa del Sur",
            name="Agua mineral",
            unit="500 ml",
            category="bebidas",
            price=800,
            stock=0,
        ),
    ]
    db_session.add_all(datos)
    db_session.commit()
    return datos


def test_lista_devuelve_todos_los_productos(client, productos):
    respuesta = client.get("/api/products")
    assert respuesta.status_code == 200
    assert len(respuesta.json()) == 3


def test_lista_ordenada_por_id(client, productos):
    respuesta = client.get("/api/products")
    assert [p["id"] for p in respuesta.json()] == [1, 2, 3]


def test_lista_vacia_sin_productos(client):
    respuesta = client.get("/api/products")
    assert respuesta.status_code == 200
    assert respuesta.json() == []


def test_filtro_por_categoria(client, productos):
    respuesta = client.get("/api/products", params={"category": "bebidas"})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert [p["id"] for p in cuerpo] == [1, 2]
    assert all(p["category"] == "bebidas" for p in cuerpo)


def test_categoria_sin_productos_devuelve_lista_vacia(client, productos):
    respuesta = client.get("/api/products", params={"category": "cigarrillos"})
    assert respuesta.status_code == 200
    assert respuesta.json() == []


def test_categoria_invalida_devuelve_422(client, productos):
    respuesta = client.get("/api/products", params={"category": "xyz"})
    assert respuesta.status_code == 422
    error = respuesta.json()["detail"][0]
    assert error["loc"] == ["query", "category"]


def test_producto_existente_devuelve_campos_del_contrato(client, productos):
    respuesta = client.get("/api/products/1")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert set(cuerpo) == CAMPOS_PRODUCTO
    assert cuerpo == {
        "id": 1,
        "brand": "Coca-Cola",
        "name": "Original",
        "unit": "500 ml",
        "category": "bebidas",
        "price": 1200.0,
        "offer_price": 1000.0,
        "stock": 25,
        "description": "Gaseosa clásica",
        "image": "coca.png",
    }


def test_producto_sin_opcionales_devuelve_null(client, productos):
    cuerpo = client.get("/api/products/3").json()
    assert set(cuerpo) == CAMPOS_PRODUCTO
    assert cuerpo["description"] is None
    assert cuerpo["image"] is None
    assert cuerpo["offer_price"] is None


def test_lista_trae_productos_con_y_sin_oferta(client, productos):
    cuerpo = client.get("/api/products").json()
    ofertas = {p["id"]: p["offer_price"] for p in cuerpo}
    assert ofertas == {1: 1000.0, 2: None, 3: None}
    assert all(set(p) == CAMPOS_PRODUCTO for p in cuerpo)


def test_filtro_por_categoria_incluye_la_oferta(client, productos):
    cuerpo = client.get("/api/products", params={"category": "bebidas"}).json()
    assert [(p["brand"], p["offer_price"]) for p in cuerpo] == [
        ("Coca-Cola", 1000.0),
        ("Villa del Sur", None),
    ]


def test_producto_inexistente_devuelve_404(client, productos):
    respuesta = client.get("/api/products/999")
    assert respuesta.status_code == 404
    assert respuesta.json() == {"detail": "Product 999 not found"}


def test_id_no_numerico_devuelve_422(client, productos):
    respuesta = client.get("/api/products/abc")
    assert respuesta.status_code == 422
    error = respuesta.json()["detail"][0]
    assert error["loc"] == ["path", "product_id"]


# --- Validación de ProductIn ---------------------------------------------------------
# ProductIn lo usa el seed. Los endpoints del admin reciben ProductAdminIn, que
# comparte estas validaciones (ver test_products_admin.py).

PRODUCTO_VALIDO = {
    "brand": "Coca-Cola",
    "name": "Original",
    "unit": "500 ml",
    "category": "bebidas",
    "price": 1200,
    "stock": 25,
}


def test_product_in_valido_sin_oferta():
    producto = ProductIn(**PRODUCTO_VALIDO)
    assert producto.offer_price is None


def test_product_in_valido_con_oferta():
    assert ProductIn(**PRODUCTO_VALIDO, offer_price=1000).offer_price == 1000


@pytest.mark.parametrize(
    "offer_price, tipo",
    [
        (1200, "value_error"),  # igual al precio
        (1500, "value_error"),  # mayor al precio
        (0, "greater_than"),
        (-100, "greater_than"),
    ],
    ids=["igual", "mayor", "cero", "negativo"],
)
def test_offer_price_invalido(offer_price, tipo):
    with pytest.raises(ValidationError) as error:
        ProductIn(**PRODUCTO_VALIDO, offer_price=offer_price)
    assert error.value.errors()[0]["type"] == tipo


@pytest.mark.parametrize("campo", ["brand", "name", "unit"])
@pytest.mark.parametrize("valor", ["", "   "], ids=["vacio", "espacios"])
def test_brand_name_y_unit_no_pueden_estar_vacios(campo, valor):
    with pytest.raises(ValidationError) as error:
        ProductIn(**{**PRODUCTO_VALIDO, campo: valor})
    assert error.value.errors()[0]["loc"] == (campo,)
    assert error.value.errors()[0]["type"] == "string_too_short"


@pytest.mark.parametrize("campo", ["brand", "unit"])
def test_brand_y_unit_son_obligatorios(campo):
    datos = {k: v for k, v in PRODUCTO_VALIDO.items() if k != campo}
    with pytest.raises(ValidationError) as error:
        ProductIn(**datos)
    assert error.value.errors()[0]["type"] == "missing"


# --- Restricciones de la base ---------------------------------------------------------


@pytest.mark.parametrize("offer_price", [1200, 1500, 0, -1])
def test_la_base_rechaza_una_oferta_invalida(db_session, offer_price):
    db_session.add(
        Product(**{**PRODUCTO_VALIDO, "offer_price": offer_price}, description=None, image=None)
    )
    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize("campo", ["brand", "unit"])
def test_la_base_rechaza_brand_o_unit_vacios(db_session, campo):
    db_session.add(Product(**{**PRODUCTO_VALIDO, campo: "  "}))
    with pytest.raises(IntegrityError):
        db_session.commit()
