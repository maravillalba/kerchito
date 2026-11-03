import pytest

from models import Product


@pytest.fixture
def productos(db_session):
    items = [
        Product(id=1, name="Coca-Cola 500ml", category="bebidas",
                price=1200, stock=25, description=None, image=None),
        Product(id=2, name="Alfajor Jorgito", category="golosinas_snacks",
                price=1100, stock=50, description=None, image=None),
        Product(id=3, name="Lavandina 1L", category="limpieza",
                price=900, stock=0, description=None, image=None),
    ]
    db_session.add_all(items)
    db_session.commit()
    return items


def stock_de(client, product_id):
    return client.get(f"/api/products/{product_id}").json()["stock"]


def test_pedido_valido_devuelve_201_con_total_y_unit_price(client, productos):
    resp = client.post("/api/orders", json={"items": [
        {"product_id": 1, "quantity": 2},
        {"product_id": 2, "quantity": 1},
    ]})
    assert resp.status_code == 201
    data = resp.json()
    assert data["total"] == 3500
    precios = {i["product_id"]: i["unit_price"] for i in data["items"]}
    assert precios == {1: 1200, 2: 1100}


def test_pedido_valido_descuenta_stock(client, productos):
    client.post("/api/orders", json={"items": [
        {"product_id": 1, "quantity": 2},
        {"product_id": 2, "quantity": 1},
    ]})
    assert stock_de(client, 1) == 23
    assert stock_de(client, 2) == 49


def test_producto_inexistente_devuelve_404(client, productos):
    resp = client.post("/api/orders", json={"items": [
        {"product_id": 999, "quantity": 1},
    ]})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Product 999 not found"


def test_stock_insuficiente_devuelve_409_y_no_descuenta(client, productos):
    resp = client.post("/api/orders", json={"items": [
        {"product_id": 1, "quantity": 9999},
    ]})
    assert resp.status_code == 409
    assert resp.json()["detail"] == "Insufficient stock for product 1"
    assert stock_de(client, 1) == 25


def test_producto_sin_stock_devuelve_409(client, productos):
    resp = client.post("/api/orders", json={"items": [
        {"product_id": 3, "quantity": 1},
    ]})
    assert resp.status_code == 409


def test_rollback_item_valido_mas_item_sin_stock(client, productos):
    resp = client.post("/api/orders", json={"items": [
        {"product_id": 1, "quantity": 1},
        {"product_id": 3, "quantity": 5},
    ]})
    assert resp.status_code == 409
    # el item valido NO se descuenta y no se guarda ningun pedido
    assert stock_de(client, 1) == 25
    assert client.get("/api/orders").json() == []


def test_primer_item_que_falla_gana(client, productos):
    resp = client.post("/api/orders", json={"items": [
        {"product_id": 999, "quantity": 1},
        {"product_id": 1, "quantity": 9999},
    ]})
    assert resp.status_code == 404


def test_producto_repetido_suma_stock_y_guarda_dos_renglones(client, productos):
    resp = client.post("/api/orders", json={"items": [
        {"product_id": 1, "quantity": 1},
        {"product_id": 1, "quantity": 1},
    ]})
    assert resp.status_code == 201
    assert resp.json()["total"] == 2400
    assert len(resp.json()["items"]) == 2
    assert stock_de(client, 1) == 23


@pytest.mark.parametrize("body", [
    {"items": []},
    {"items": [{"product_id": 1, "quantity": 0}]},
    {"items": [{"product_id": 1, "quantity": -1}]},
])
def test_validaciones_devuelven_422(client, productos, body):
    resp = client.post("/api/orders", json=body)
    assert resp.status_code == 422
    assert stock_de(client, 1) == 25


def test_listar_pedidos_vacio(client, productos):
    resp = client.get("/api/orders")
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_pedidos_mas_nuevo_primero_con_items(client, productos):
    client.post("/api/orders", json={"items": [{"product_id": 1, "quantity": 1}]})
    client.post("/api/orders", json={"items": [{"product_id": 2, "quantity": 2}]})
    data = client.get("/api/orders").json()
    assert [o["id"] for o in data] == [2, 1]
    assert len(data[0]["items"]) == 1