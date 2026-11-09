import pytest

from models import Product


@pytest.fixture
def productos(db_session):
    items = [
        Product(id=1, brand="Coca-Cola", name="Original", unit="500 ml", category="bebidas",
                price=1200, stock=25, description=None, image=None),
        Product(id=2, brand="Jorgito", name="Alfajor", unit="55 g", category="golosinas_snacks",
                price=1100, stock=50, description=None, image=None),
        Product(id=3, brand="Ayudín", name="Lavandina", unit="1 L", category="limpieza",
                price=900, stock=0, description=None, image=None),
        # En oferta: el pedido tiene que cobrar 1600, no 1900.
        Product(id=4, brand="Cruz de Malta", name="Yerba mate", unit="500 g",
                category="almacen", price=1900, offer_price=1600, stock=30,
                description=None, image=None),
    ]
    db_session.add_all(items)
    db_session.commit()
    return items


@pytest.fixture
def pedir(client, customer_headers):
    # Estos tests revisan precios y stock: subtotal es lo que antes era total.
    # Los descuentos y los puntos se prueban en test_points.py.
    def _pedir(items):
        return client.post(
            "/api/orders",
            json={"items": items, "payment_method": "efectivo"},
            headers=customer_headers,
        )

    return _pedir


def stock_de(client, product_id):
    return client.get(f"/api/products/{product_id}").json()["stock"]


def test_pedido_valido_devuelve_201_con_total_y_unit_price(pedir, productos):
    resp = pedir([
        {"product_id": 1, "quantity": 2},
        {"product_id": 2, "quantity": 1},
    ])
    assert resp.status_code == 201
    data = resp.json()
    assert data["subtotal"] == 3500
    precios = {i["product_id"]: i["unit_price"] for i in data["items"]}
    assert precios == {1: 1200, 2: 1100}


def test_producto_en_oferta_cobra_el_precio_de_oferta(pedir, productos):
    resp = pedir([{"product_id": 4, "quantity": 2}])
    assert resp.status_code == 201
    data = resp.json()
    assert data["items"][0]["unit_price"] == 1600
    assert data["subtotal"] == 3200


def test_pedido_mixto_usa_oferta_solo_donde_hay(pedir, productos):
    resp = pedir([
        {"product_id": 1, "quantity": 1},  # sin oferta: 1200
        {"product_id": 4, "quantity": 1},  # en oferta: 1600 (normal 1900)
    ])
    assert resp.status_code == 201
    data = resp.json()
    precios = {i["product_id"]: i["unit_price"] for i in data["items"]}
    assert precios == {1: 1200, 4: 1600}
    assert data["subtotal"] == 2800


def test_el_precio_que_manda_el_front_se_ignora(pedir, productos):
    # Un unit_price en el pedido no es parte del contrato: el backend calcula el precio.
    resp = pedir([{"product_id": 4, "quantity": 1, "unit_price": 1}])
    assert resp.status_code == 201
    assert resp.json()["items"][0]["unit_price"] == 1600
    assert resp.json()["subtotal"] == 1600


def test_el_pedido_guardado_conserva_el_precio_de_oferta(client, pedir, productos, admin_headers):
    pedir([{"product_id": 4, "quantity": 1}])
    pedido = client.get("/api/orders", headers=admin_headers).json()[0]
    assert pedido["items"][0]["unit_price"] == 1600
    assert pedido["subtotal"] == 1600


def test_pedido_valido_descuenta_stock(client, pedir, productos):
    pedir([
        {"product_id": 1, "quantity": 2},
        {"product_id": 2, "quantity": 1},
    ])
    assert stock_de(client, 1) == 23
    assert stock_de(client, 2) == 49


def test_producto_inexistente_devuelve_404(pedir, productos):
    resp = pedir([{"product_id": 999, "quantity": 1}])
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Product 999 not found"


def test_stock_insuficiente_devuelve_409_y_no_descuenta(client, pedir, productos):
    resp = pedir([{"product_id": 1, "quantity": 9999}])
    assert resp.status_code == 409
    assert resp.json()["detail"] == "Insufficient stock for product 1"
    assert stock_de(client, 1) == 25


def test_producto_sin_stock_devuelve_409(pedir, productos):
    resp = pedir([{"product_id": 3, "quantity": 1}])
    assert resp.status_code == 409


def test_rollback_item_valido_mas_item_sin_stock(client, pedir, productos, admin_headers):
    resp = pedir([
        {"product_id": 1, "quantity": 1},
        {"product_id": 3, "quantity": 5},
    ])
    assert resp.status_code == 409
    # el item valido NO se descuenta y no se guarda ningun pedido
    assert stock_de(client, 1) == 25
    assert client.get("/api/orders", headers=admin_headers).json() == []


def test_primer_item_que_falla_gana(pedir, productos):
    resp = pedir([
        {"product_id": 999, "quantity": 1},
        {"product_id": 1, "quantity": 9999},
    ])
    assert resp.status_code == 404


def test_producto_repetido_suma_stock_y_guarda_dos_renglones(client, pedir, productos):
    resp = pedir([
        {"product_id": 1, "quantity": 1},
        {"product_id": 1, "quantity": 1},
    ])
    assert resp.status_code == 201
    assert resp.json()["subtotal"] == 2400
    assert len(resp.json()["items"]) == 2
    assert stock_de(client, 1) == 23


@pytest.mark.parametrize("items", [
    [],
    [{"product_id": 1, "quantity": 0}],
    [{"product_id": 1, "quantity": -1}],
])
def test_validaciones_devuelven_422(client, pedir, productos, items):
    resp = pedir(items)
    assert resp.status_code == 422
    assert stock_de(client, 1) == 25


def test_listar_pedidos_vacio(client, productos, admin_headers):
    resp = client.get("/api/orders", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_pedidos_mas_nuevo_primero_con_items(client, pedir, productos, admin_headers):
    pedir([{"product_id": 1, "quantity": 1}])
    pedir([{"product_id": 2, "quantity": 2}])
    data = client.get("/api/orders", headers=admin_headers).json()
    assert [o["id"] for o in data] == [2, 1]
    assert len(data[0]["items"]) == 1
