from datetime import datetime

import pytest

from conftest import crear_usuario, headers_de
from models import OrderItem, PointsMovement, Product

RUTAS = [
    ("get", "/api/admin/summary"),
    ("get", "/api/admin/customers"),
    ("get", "/api/admin/customers/1"),
    ("post", "/api/admin/customers/1/points"),
]


@pytest.fixture()
def catalogo(db_session):
    db_session.add_all(
        [
            Product(id=1, brand="A", name="Uno", unit="1 u.", category="almacen",
                    price=1000, stock=10, cost=600),
            # En oferta: la ganancia se calcula con lo cobrado, 800 - 500.
            Product(id=2, brand="B", name="Dos", unit="1 u.", category="almacen",
                    price=1000, offer_price=800, stock=20, cost=500),
            Product(id=3, brand="C", name="Tres", unit="1 u.", category="almacen",
                    price=1000, stock=5, cost=100),
        ]
    )
    db_session.commit()


@pytest.fixture()
def comprar(client, catalogo):
    def _comprar(headers, items, use_points=False):
        return client.post(
            "/api/orders",
            json={
                "items": [{"product_id": p, "quantity": q} for p, q in items],
                "payment_method": "efectivo",
                "use_points": use_points,
            },
            headers=headers,
        ).json()

    return _comprar


def resumen(client, headers):
    return client.get("/api/admin/summary", headers=headers).json()


# --- Permisos ---------------------------------------------------------------------


@pytest.mark.parametrize("metodo, ruta", RUTAS)
def test_sin_sesion_devuelve_401(client, metodo, ruta):
    assert getattr(client, metodo)(ruta).status_code == 401


@pytest.mark.parametrize("metodo, ruta", RUTAS)
def test_un_cliente_recibe_403(client, customer_headers, metodo, ruta):
    assert getattr(client, metodo)(ruta, headers=customer_headers).status_code == 403


# --- Resumen ----------------------------------------------------------------------


def test_resumen_sin_ventas(client, admin_headers, catalogo):
    assert resumen(client, admin_headers) == {
        "total_revenue": 0,
        "net_profit": 0,
        "stock_units": 35,
        "points_in_circulation": 0,
        "best_sellers": [],
        "top_customers": [],
    }


def test_resumen_cobrado_y_ganancia(client, comprar, admin_headers, customer_headers):
    # Subtotal 2 x 1000 + 1 x 800 = 2800; con el 15% se cobran 2380.
    comprar(customer_headers, [(1, 2), (2, 1)])
    data = resumen(client, admin_headers)
    assert data["total_revenue"] == 2380
    # (1000 - 600) x 2 + (800 - 500) x 1 = 1100, menos los 420 del 15%.
    assert data["net_profit"] == 680
    assert data["stock_units"] == 32
    assert data["points_in_circulation"] == 23


def test_la_ganancia_resta_el_canje_una_sola_vez(
    client, db_session, comprar, cliente, admin_headers, customer_headers
):
    comprar(customer_headers, [(3, 1)])  # 1000 - 15% = 850. Ganancia 900 - 150 = 750.
    db_session.add(PointsMovement(user_id=cliente.id, points=92, reason="Prueba"))  # Saldo: 100.
    db_session.commit()
    pedido = comprar(customer_headers, [(3, 1)], use_points=True)
    assert pedido["points_discount"] == 500
    assert pedido["discount_amount"] == 500
    # 750 + (900 - 500). Si el canje se restara dos veces, daría 650.
    assert resumen(client, admin_headers)["net_profit"] == 1150


def test_la_ganancia_coincide_con_lo_cobrado_menos_el_costo(
    client, comprar, admin_headers, customer_headers
):
    comprar(customer_headers, [(1, 2), (2, 1)])
    data = resumen(client, admin_headers)
    assert data["net_profit"] == data["total_revenue"] - (600 * 2 + 500)


def test_la_ganancia_puede_ser_negativa(client, db_session, comprar, cliente, admin_headers, customer_headers):
    comprar(customer_headers, [(3, 1)])  # Consume el 15%.
    db_session.add(PointsMovement(user_id=cliente.id, points=200, reason="Prueba"))
    db_session.commit()
    comprar(customer_headers, [(1, 1)], use_points=True)  # 1000 con 1000 de canje: cobra 0.
    # 750 de la primera, más (400 - 1000) de la segunda.
    assert resumen(client, admin_headers)["net_profit"] == 150


def test_editar_el_costo_no_cambia_la_ganancia_de_ventas_pasadas(
    client, comprar, admin_headers, customer_headers
):
    comprar(customer_headers, [(1, 1)])  # (1000 - 600) - 150 = 250.
    assert resumen(client, admin_headers)["net_profit"] == 250
    client.put(
        "/api/products/1",
        json={"brand": "A", "name": "Uno", "unit": "1 u.", "category": "almacen",
              "price": 1000, "stock": 9, "cost": 999},
        headers=admin_headers,
    )
    assert resumen(client, admin_headers)["net_profit"] == 250
    # Una venta nueva sí usa el costo nuevo: 250 + (1000 - 999).
    comprar(customer_headers, [(1, 1)])
    assert resumen(client, admin_headers)["net_profit"] == 251


def test_el_renglon_guarda_el_costo_pero_no_lo_muestra(
    client, db_session, comprar, admin_headers, customer_headers
):
    pedido = comprar(customer_headers, [(1, 1)])
    assert db_session.query(OrderItem).one().unit_cost == 600
    assert "unit_cost" not in pedido["items"][0]
    for ruta, headers in [
        ("/api/orders/mine", customer_headers),
        ("/api/orders", admin_headers),
        ("/api/admin/orders", admin_headers),
    ]:
        assert "unit_cost" not in client.get(ruta, headers=headers).json()[0]["items"][0]


def test_resumen_no_cuenta_las_ventas_anuladas(client, comprar, admin_headers, customer_headers):
    primero = comprar(customer_headers, [(1, 1)])
    comprar(customer_headers, [(3, 1)])  # Sin 15%: 1000. Ganancia 900. 10 puntos.
    client.patch(f"/api/orders/{primero['id']}/cancel", headers=admin_headers)
    data = resumen(client, admin_headers)
    assert data["total_revenue"] == 1000
    assert data["net_profit"] == 900
    assert data["stock_units"] == 34
    assert data["points_in_circulation"] == 10
    assert [b["product_id"] for b in data["best_sellers"]] == [3]


def test_mas_vendidos_ordenados_y_limitados(client, comprar, admin_headers, customer_headers):
    comprar(customer_headers, [(1, 1), (2, 3), (3, 2)])
    assert resumen(client, admin_headers)["best_sellers"] == [
        {"product_id": 2, "product_name": "B Dos 1 u.", "units_sold": 3},
        {"product_id": 3, "product_name": "C Tres 1 u.", "units_sold": 2},
        {"product_id": 1, "product_name": "A Uno 1 u.", "units_sold": 1},
    ]


def test_top_clientes_por_puntos(client, db_session, admin_headers):
    usuarios = [crear_usuario(db_session, email=f"c{i}@test.com", first_name=f"C{i}") for i in range(7)]
    for i, usuario in enumerate(usuarios):
        db_session.add(PointsMovement(user_id=usuario.id, points=(i + 1) * 10, reason="Prueba"))
    sin_puntos = crear_usuario(db_session, email="cero@test.com")
    db_session.add(PointsMovement(user_id=sin_puntos.id, points=-5, reason="Prueba"))
    db_session.commit()

    top = resumen(client, admin_headers)["top_customers"]
    assert [c["points"] for c in top] == [70, 60, 50, 40, 30]
    assert top[0]["first_name"] == "C6"


def test_top_clientes_cuenta_solo_compras_activas(client, comprar, admin_headers, customer_headers):
    primero = comprar(customer_headers, [(1, 1)])
    comprar(customer_headers, [(3, 1)])
    comprar(customer_headers, [(3, 1)])
    client.patch(f"/api/orders/{primero['id']}/cancel", headers=admin_headers)
    [top] = resumen(client, admin_headers)["top_customers"]
    assert top["orders_count"] == 2


# --- Clientes ---------------------------------------------------------------------


def test_clientes_vacio_no_incluye_al_admin(client, admin_headers):
    assert client.get("/api/admin/customers", headers=admin_headers).json() == []


def test_cliente_sin_compras(client, cliente, admin_headers):
    [data] = client.get("/api/admin/customers", headers=admin_headers).json()
    assert data == {
        "id": cliente.id,
        "first_name": "Ana",
        "last_name": "Pérez",
        "email": "cliente@test.com",
        "phone": None,
        "created_at": cliente.created_at.isoformat(),
        "points": 0,
        "level": "Bronce",
        "orders_count": 0,
        "total_spent": 0,
        "last_order_at": None,
    }


def test_clientes_con_compras_no_cuenta_anuladas_ni_multiplica(
    client, comprar, admin_headers, customer_headers
):
    primero = comprar(customer_headers, [(1, 1)])  # 850, 8 puntos.
    segundo = comprar(customer_headers, [(1, 2)])  # 2000, 20 puntos.
    tercero = comprar(customer_headers, [(1, 1)])  # 1000, 10 puntos.
    client.patch(f"/api/orders/{tercero['id']}/cancel", headers=admin_headers)

    [data] = client.get("/api/admin/customers", headers=admin_headers).json()
    assert data["orders_count"] == 2
    # Hay más movimientos que pedidos: si el total se multiplicara, daría de más.
    assert data["total_spent"] == 2850
    assert data["points"] == 28
    assert datetime.fromisoformat(data["last_order_at"]) >= datetime.fromisoformat(primero["created_at"])
    assert data["last_order_at"] == segundo["created_at"]


def test_el_nivel_sale_del_saldo(client, db_session, cliente, admin_headers):
    db_session.add(PointsMovement(user_id=cliente.id, points=300, reason="Prueba"))
    db_session.commit()
    [data] = client.get("/api/admin/customers", headers=admin_headers).json()
    assert data["level"] == "Plata"


def test_detalle_con_movimientos_del_mas_nuevo_al_mas_viejo(
    client, comprar, cliente, admin_headers, customer_headers
):
    pedido = comprar(customer_headers, [(1, 1)])
    client.post(
        f"/api/admin/customers/{cliente.id}/points",
        json={"points": 5, "reason": "Regalo"},
        headers=admin_headers,
    )
    data = client.get(f"/api/admin/customers/{cliente.id}", headers=admin_headers).json()
    assert data["points"] == 13
    assert data["orders_count"] == 1
    assert data["total_spent"] == 850
    assert [(m["points"], m["order_id"], m["reason"]) for m in data["movements"]] == [
        (5, None, "Regalo"),
        (8, pedido["id"], f"Compra del pedido #{pedido['id']}"),
    ]


def test_detalle_no_mezcla_otros_clientes(client, db_session, comprar, cliente, admin_headers, customer_headers):
    otro = crear_usuario(db_session, email="otro@test.com")
    comprar(headers_de(db_session, otro), [(1, 1)])
    comprar(customer_headers, [(3, 1)])
    data = client.get(f"/api/admin/customers/{cliente.id}", headers=admin_headers).json()
    assert data["orders_count"] == 1
    assert len(data["movements"]) == 1


@pytest.mark.parametrize("ruta", ["/api/admin/customers/99", "/api/admin/customers/99/points"])
def test_cliente_inexistente_devuelve_404(client, admin_headers, ruta):
    if ruta.endswith("points"):
        respuesta = client.post(ruta, json={"points": 1, "reason": "x"}, headers=admin_headers)
    else:
        respuesta = client.get(ruta, headers=admin_headers)
    assert respuesta.status_code == 404


def test_el_admin_no_es_un_cliente(client, admin, admin_headers):
    assert client.get(f"/api/admin/customers/{admin.id}", headers=admin_headers).status_code == 404


# --- Ajuste manual ----------------------------------------------------------------


def test_ajuste_suma_y_resta(client, cliente, admin_headers, customer_headers):
    ruta = f"/api/admin/customers/{cliente.id}/points"
    respuesta = client.post(ruta, json={"points": 100, "reason": " Compensación "}, headers=admin_headers)
    assert respuesta.status_code == 201
    assert respuesta.json()["points"] == 100
    assert respuesta.json()["movements"][0]["reason"] == "Compensación"

    assert client.post(ruta, json={"points": -30, "reason": "Error"}, headers=admin_headers).json()["points"] == 70
    assert client.get("/api/auth/me", headers=customer_headers).json()["points"] == 70


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"points": 10},
        {"points": 10, "reason": ""},
        {"points": 10, "reason": "   "},
        {"points": 0, "reason": "Nada"},
        {"reason": "Sin puntos"},
        {"points": 1.5, "reason": "Decimal"},
        {"points": 1, "reason": "x" * 201},
    ],
    ids=["sin-motivo", "motivo-vacio", "motivo-espacios", "cero", "sin-puntos", "decimal", "motivo-largo"],
)
def test_ajuste_invalido_devuelve_422(client, db_session, cliente, admin_headers, cuerpo):
    respuesta = client.post(
        f"/api/admin/customers/{cliente.id}/points", json=cuerpo, headers=admin_headers
    )
    assert respuesta.status_code == 422
    assert db_session.query(PointsMovement).count() == 0
