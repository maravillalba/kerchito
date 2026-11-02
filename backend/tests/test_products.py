import pytest

from models import Product

CAMPOS_PRODUCTO = {"id", "name", "category", "price", "stock", "description", "image"}


@pytest.fixture()
def productos(db_session):
    # Se insertan con ids desordenados para comprobar que la API ordena por id.
    datos = [
        Product(id=3, name="Leche entera 1L", category="lacteos", price=1300, stock=20),
        Product(
            id=1,
            name="Coca-Cola 500ml",
            category="bebidas",
            price=1200,
            stock=25,
            description="Gaseosa clásica",
            image="coca.png",
        ),
        Product(id=2, name="Agua mineral 500ml", category="bebidas", price=800, stock=0),
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
        "name": "Coca-Cola 500ml",
        "category": "bebidas",
        "price": 1200.0,
        "stock": 25,
        "description": "Gaseosa clásica",
        "image": "coca.png",
    }


def test_producto_sin_opcionales_devuelve_null(client, productos):
    cuerpo = client.get("/api/products/3").json()
    assert cuerpo["description"] is None
    assert cuerpo["image"] is None


def test_producto_inexistente_devuelve_404(client, productos):
    respuesta = client.get("/api/products/999")
    assert respuesta.status_code == 404
    assert respuesta.json() == {"detail": "Product 999 not found"}


def test_id_no_numerico_devuelve_422(client, productos):
    respuesta = client.get("/api/products/abc")
    assert respuesta.status_code == 422
    error = respuesta.json()["detail"][0]
    assert error["loc"] == ["path", "product_id"]
