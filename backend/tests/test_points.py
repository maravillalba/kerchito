import pytest

from conftest import crear_usuario, headers_de
from models import Order, PointsMovement, Product
from points import calculate_order_amounts, level_for


@pytest.fixture()
def catalogo(db_session):
    db_session.add_all(
        [
            Product(id=1, brand="A", name="Mil", unit="1 u.", category="almacen", price=1000, stock=100),
            Product(id=2, brand="B", name="Cinco mil", unit="1 u.", category="almacen", price=5000, stock=100),
            Product(id=3, brand="C", name="Setecientos", unit="1 u.", category="almacen", price=700, stock=100),
            # En oferta: el 15% se calcula sobre 800, no sobre 1000.
            Product(id=4, brand="D", name="Oferta", unit="1 u.", category="almacen", price=1000, offer_price=800, stock=100),
            Product(id=5, brand="E", name="Sin stock", unit="1 u.", category="almacen", price=1000, stock=0),
        ]
    )
    db_session.commit()


@pytest.fixture()
def comprar(client, catalogo, customer_headers):
    def _comprar(product_id=1, quantity=1, use_points=False, headers=customer_headers, medio="efectivo"):
        return client.post(
            "/api/orders",
            json={
                "items": [{"product_id": product_id, "quantity": quantity}],
                "payment_method": medio,
                "use_points": use_points,
            },
            headers=headers,
        )

    return _comprar


@pytest.fixture()
def dar_puntos(db_session):
    def _dar_puntos(usuario, puntos):
        db_session.add(PointsMovement(user_id=usuario.id, points=puntos, reason="Prueba"))
        db_session.commit()

    return _dar_puntos


def saldo(client, headers):
    return client.get("/api/auth/me", headers=headers).json()["points"]


def stock(client, product_id=1):
    return client.get(f"/api/products/{product_id}").json()["stock"]


# --- Reglas -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "subtotal, primera, balance, usar, primer_descuento, canje, total, usados, ganados",
    [
        (1000, False, 0, False, 0, 0, 1000, 0, 10),
        (1000, True, 0, False, 150, 0, 850, 0, 8),
        # Canje: todos los bloques que alcancen, y sobra lo que no llega a un bloque.
        (5000, False, 350, True, 0, 1500, 3500, 300, 35),
        (5000, False, 99, True, 0, 0, 5000, 0, 50),
        (5000, False, 350, False, 0, 0, 5000, 0, 50),
        # Sin pasarse de lo que queda por pagar.
        (700, False, 1000, True, 0, 500, 200, 100, 2),
        (400, False, 1000, True, 0, 0, 400, 0, 4),
        # Exacto: el total queda en 0 y no se ganan puntos.
        (1000, False, 200, True, 0, 1000, 0, 200, 0),
        # El 15% va primero y el canje se calcula sobre lo que queda.
        (1000, True, 300, True, 150, 500, 350, 100, 3),
        # Saldo negativo: no hay canje.
        (1000, False, -50, True, 0, 0, 1000, 0, 10),
        # Redondeo: 15% de 33,33 = 4,9995, se redondea al centavo.
        (33.33, True, 0, False, 5.0, 0, 28.33, 0, 0),
        # Hacia abajo: 199,99 da 1 punto.
        (199.99, False, 0, False, 0, 0, 199.99, 0, 1),
    ],
)
def test_calculo(subtotal, primera, balance, usar, primer_descuento, canje, total, usados, ganados):
    r = calculate_order_amounts(subtotal, primera, balance, usar)
    assert r.first_purchase_discount == primer_descuento
    assert r.points_discount == canje
    assert r.discount_amount == primer_descuento + canje
    assert r.total == total
    assert r.points_used == usados
    assert r.points_earned == ganados


@pytest.mark.parametrize(
    "balance, nivel",
    [(-10, "Bronce"), (0, "Bronce"), (299, "Bronce"), (300, "Plata"), (999, "Plata"), (1000, "Oro")],
)
def test_niveles(balance, nivel):
    assert level_for(balance) == nivel


# --- Autenticación y validación del pedido ----------------------------------------

PEDIDO = {"items": [{"product_id": 1, "quantity": 1}], "payment_method": "efectivo"}


def test_pedido_sin_sesion_devuelve_401_y_no_descuenta(client, catalogo):
    assert client.post("/api/orders", json=PEDIDO).status_code == 401
    assert stock(client) == 100


def test_pedido_del_admin_devuelve_403(client, catalogo, admin_headers):
    assert client.post("/api/orders", json=PEDIDO, headers=admin_headers).status_code == 403
    assert stock(client) == 100


@pytest.mark.parametrize("medio", ["efectivo", "transferencia", "tarjeta", "mercado_pago"])
def test_medios_de_pago_validos(comprar, medio):
    respuesta = comprar(medio=medio)
    assert respuesta.status_code == 201
    assert respuesta.json()["payment_method"] == medio


@pytest.mark.parametrize("medio", ["pendiente", "", None])
def test_medio_de_pago_invalido_devuelve_422(client, catalogo, customer_headers, medio):
    cuerpo = {**PEDIDO, "payment_method": medio}
    assert client.post("/api/orders", json=cuerpo, headers=customer_headers).status_code == 422


def test_medio_de_pago_es_obligatorio(client, catalogo, customer_headers):
    cuerpo = {"items": PEDIDO["items"]}
    assert client.post("/api/orders", json=cuerpo, headers=customer_headers).status_code == 422


def test_los_montos_que_manda_el_front_se_ignoran(client, catalogo, customer_headers):
    cuerpo = {**PEDIDO, "total": 1, "discount_amount": 999, "points_earned": 999999, "user_id": 42}
    data = client.post("/api/orders", json=cuerpo, headers=customer_headers).json()
    assert data["total"] == 850
    assert data["points_earned"] == 8


# --- 15% de primera compra --------------------------------------------------------


def test_primera_compra_lleva_15_por_ciento(comprar):
    data = comprar().json()
    assert data["subtotal"] == 1000
    assert data["first_purchase_discount"] == 150
    assert data["discount_amount"] == 150
    assert data["total"] == 850


def test_el_15_por_ciento_es_solo_una_vez(comprar):
    comprar()
    data = comprar().json()
    assert data["first_purchase_discount"] == 0
    assert data["total"] == 1000


def test_el_15_por_ciento_se_calcula_con_la_oferta_aplicada(comprar):
    data = comprar(product_id=4).json()
    assert data["subtotal"] == 800
    assert data["first_purchase_discount"] == 120
    assert data["total"] == 680


def test_cada_cliente_tiene_su_primera_compra(comprar, db_session):
    comprar()
    otro = crear_usuario(db_session, email="otro@test.com")
    assert comprar(headers=headers_de(db_session, otro)).json()["first_purchase_discount"] == 150


def test_pedido_fallido_no_consume_la_primera_compra(comprar):
    assert comprar(product_id=5).status_code == 409
    assert comprar().json()["first_purchase_discount"] == 150


def test_me_informa_si_corresponde_el_15(client, comprar, customer_headers):
    assert client.get("/api/auth/me", headers=customer_headers).json()["first_purchase_available"] is True
    comprar()
    assert client.get("/api/auth/me", headers=customer_headers).json()["first_purchase_available"] is False


def test_el_admin_no_tiene_puntos_ni_15(client, admin_headers):
    data = client.get("/api/auth/me", headers=admin_headers).json()
    assert data["points"] == 0
    assert data["first_purchase_available"] is False


# --- Puntos -----------------------------------------------------------------------


def test_compra_suma_puntos_sobre_el_total_final(client, comprar, customer_headers):
    data = comprar(product_id=2).json()  # 5000 - 15% = 4250
    assert data["points_earned"] == 42
    assert data["points_balance"] == 42
    assert saldo(client, customer_headers) == 42


def test_canje_descuenta_y_registra_movimientos(
    client, comprar, dar_puntos, cliente, customer_headers, db_session
):
    comprar()  # Consume la primera compra: 850 de total, 8 puntos.
    dar_puntos(cliente, 342)  # Saldo: 350.
    data = comprar(product_id=2, use_points=True).json()
    assert data["points_used"] == 300
    assert data["points_discount"] == 1500
    assert data["first_purchase_discount"] == 0
    assert data["total"] == 3500
    assert data["points_earned"] == 35
    assert data["points_balance"] == 85  # 350 - 300 + 35

    movimientos = db_session.query(PointsMovement).filter_by(order_id=data["id"]).all()
    assert sorted(m.points for m in movimientos) == [-300, 35]


def test_sin_use_points_no_se_canjea(comprar, dar_puntos, cliente):
    dar_puntos(cliente, 500)
    assert comprar(use_points=False).json()["points_used"] == 0


def test_si_no_alcanzan_los_puntos_no_es_error(comprar, dar_puntos, cliente):
    dar_puntos(cliente, 99)
    respuesta = comprar(use_points=True)
    assert respuesta.status_code == 201
    assert respuesta.json()["points_used"] == 0


def test_el_canje_no_supera_el_total(comprar, dar_puntos, cliente):
    comprar()
    dar_puntos(cliente, 1000)
    data = comprar(product_id=3, use_points=True).json()  # 700: entra un solo bloque.
    assert data["points_used"] == 100
    assert data["total"] == 200


def test_el_total_puede_quedar_en_cero(comprar, dar_puntos, cliente):
    comprar()
    dar_puntos(cliente, 200)
    data = comprar(use_points=True).json()
    assert data["total"] == 0
    assert data["points_earned"] == 0


def test_15_y_canje_se_combinan(comprar, dar_puntos, cliente):
    dar_puntos(cliente, 100)
    data = comprar(use_points=True).json()
    assert data["first_purchase_discount"] == 150
    assert data["points_discount"] == 500
    assert data["discount_amount"] == 650
    assert data["total"] == 350


def test_error_de_stock_no_toca_los_puntos(client, comprar, dar_puntos, cliente, customer_headers, db_session):
    dar_puntos(cliente, 500)
    assert comprar(product_id=5, use_points=True).status_code == 409
    assert saldo(client, customer_headers) == 500
    assert db_session.query(Order).count() == 0


def test_si_falla_la_transaccion_no_queda_nada(
    client, comprar, dar_puntos, cliente, customer_headers, db_session, monkeypatch
):
    dar_puntos(cliente, 500)

    def falla():
        raise RuntimeError("falla simulada")

    with monkeypatch.context() as parche:
        parche.setattr(db_session, "commit", falla)
        with pytest.raises(RuntimeError):
            comprar(use_points=True)

    assert stock(client) == 100
    assert saldo(client, customer_headers) == 500
    assert db_session.query(Order).count() == 0


# --- Anulación --------------------------------------------------------------------


def anular(client, headers, order_id):
    return client.patch(f"/api/orders/{order_id}/cancel", headers=headers)


def test_anular_requiere_admin(client, comprar, customer_headers):
    order_id = comprar().json()["id"]
    assert client.patch(f"/api/orders/{order_id}/cancel").status_code == 401
    assert anular(client, customer_headers, order_id).status_code == 403
    assert stock(client) == 99


def test_anular_pedido_inexistente_devuelve_404(client, admin_headers):
    assert anular(client, admin_headers, 99).status_code == 404


def test_anular_devuelve_stock_y_marca_el_pedido(client, comprar, admin_headers):
    order_id = comprar(quantity=3).json()["id"]
    assert stock(client) == 97
    respuesta = anular(client, admin_headers, order_id)
    assert respuesta.status_code == 200
    assert respuesta.json()["status"] == "cancelled"
    assert stock(client) == 100


def test_anular_revierte_los_puntos_ganados(client, comprar, admin_headers, customer_headers):
    order_id = comprar().json()["id"]
    assert saldo(client, customer_headers) == 8
    anular(client, admin_headers, order_id)
    assert saldo(client, customer_headers) == 0


def test_anular_devuelve_los_puntos_usados(
    client, comprar, dar_puntos, cliente, admin_headers, customer_headers
):
    comprar()  # 8 puntos.
    dar_puntos(cliente, 92)  # Saldo: 100.
    data = comprar(use_points=True).json()  # Usa 100 y gana 5.
    assert data["points_balance"] == 5
    anular(client, admin_headers, data["id"])
    assert saldo(client, customer_headers) == 100


def test_anular_si_ya_gasto_lo_ganado_deja_saldo_negativo(
    client, comprar, dar_puntos, cliente, admin_headers, customer_headers
):
    primera = comprar(product_id=2, quantity=3).json()  # 15000 - 15% = 12750: 127 puntos.
    assert primera["points_earned"] == 127
    # Canjea 100 de esos puntos en otra compra (total 500: gana 5). Saldo: 32.
    assert comprar(use_points=True).json()["points_balance"] == 32
    anular(client, admin_headers, primera["id"])
    assert saldo(client, customer_headers) == 32 - 127


def test_con_saldo_negativo_no_se_puede_canjear(comprar, dar_puntos, cliente):
    dar_puntos(cliente, -50)
    assert comprar(use_points=True).json()["points_used"] == 0


def test_anular_dos_veces_devuelve_409_y_no_repite_nada(
    client, comprar, admin_headers, customer_headers, db_session
):
    order_id = comprar(quantity=3).json()["id"]
    anular(client, admin_headers, order_id)
    respuesta = anular(client, admin_headers, order_id)
    assert respuesta.status_code == 409
    assert stock(client) == 100
    assert saldo(client, customer_headers) == 0
    assert db_session.query(PointsMovement).filter(PointsMovement.points < 0).count() == 1


def test_anular_la_primera_compra_vuelve_a_habilitar_el_15(client, comprar, admin_headers):
    order_id = comprar().json()["id"]
    assert comprar().json()["first_purchase_discount"] == 0
    # Le queda otra compra activa: todavía no corresponde.
    anular(client, admin_headers, order_id)
    segundo = comprar().json()
    assert segundo["first_purchase_discount"] == 0
    # Anula todo lo activo: ahora sí.
    for pedido in client.get("/api/orders", headers=admin_headers).json():
        if pedido["status"] == "active":
            anular(client, admin_headers, pedido["id"])
    assert comprar().json()["first_purchase_discount"] == 150


def test_el_pedido_anulado_conserva_sus_datos(client, comprar, admin_headers):
    data = comprar().json()
    anulado = anular(client, admin_headers, data["id"]).json()
    assert anulado["total"] == data["total"]
    assert anulado["points_earned"] == data["points_earned"]


def test_si_falla_la_anulacion_no_queda_nada(
    client, comprar, admin_headers, customer_headers, db_session, monkeypatch
):
    order_id = comprar(quantity=3).json()["id"]

    def falla():
        raise RuntimeError("falla simulada")

    with monkeypatch.context() as parche:
        parche.setattr(db_session, "commit", falla)
        with pytest.raises(RuntimeError):
            anular(client, admin_headers, order_id)

    assert db_session.get(Order, order_id).status == "active"
    assert stock(client) == 97
    assert saldo(client, customer_headers) == 25  # 3000 - 15% = 2550


# --- Listados ---------------------------------------------------------------------


def test_mine_devuelve_solo_los_pedidos_propios(client, comprar, customer_headers, db_session):
    propio = comprar().json()["id"]
    otro = crear_usuario(db_session, email="otro@test.com")
    comprar(headers=headers_de(db_session, otro))
    data = client.get("/api/orders/mine", headers=customer_headers).json()
    assert [o["id"] for o in data] == [propio]
    assert data[0]["items"][0]["product_name"] == "A Mil 1 u."


def test_mine_vacio(client, customer_headers):
    assert client.get("/api/orders/mine", headers=customer_headers).json() == []


def test_mine_permisos(client, admin_headers):
    assert client.get("/api/orders/mine").status_code == 401
    assert client.get("/api/orders/mine", headers=admin_headers).status_code == 403


@pytest.mark.parametrize("ruta", ["/api/orders", "/api/admin/orders"])
def test_los_listados_generales_son_solo_del_admin(client, customer_headers, ruta):
    assert client.get(ruta).status_code == 401
    assert client.get(ruta, headers=customer_headers).status_code == 403


def test_admin_orders_trae_cliente_medio_items_puntos_y_estado(
    client, comprar, cliente, admin_headers
):
    primero = comprar(medio="tarjeta").json()["id"]
    comprar()
    anular(client, admin_headers, primero)
    data = client.get("/api/admin/orders", headers=admin_headers).json()
    assert [o["id"] for o in data] == [primero + 1, primero]
    assert [o["status"] for o in data] == ["active", "cancelled"]
    viejo = data[1]
    assert viejo["customer"] == {
        "id": cliente.id,
        "first_name": "Ana",
        "last_name": "Pérez",
        "email": "cliente@test.com",
    }
    assert viejo["payment_method"] == "tarjeta"
    assert viejo["items"][0]["product_name"] == "A Mil 1 u."
    assert viejo["total"] == 850
    assert viejo["points_earned"] == 8
