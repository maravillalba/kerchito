"""Reglas de puntos y descuentos. Es el único lugar donde están estos valores.

El frontend las repite solo para la vista previa del carrito: si cambia algo acá,
hay que cambiarlo también en frontend/src/utils/puntos.ts.
"""

from dataclasses import dataclass

# Se gana 1 punto cada esta cantidad de pesos del total final.
PESOS_PER_POINT = 100
# Canje: cada bloque de REDEEM_BLOCK_POINTS puntos descuenta REDEEM_BLOCK_VALUE pesos.
REDEEM_BLOCK_POINTS = 100
REDEEM_BLOCK_VALUE = 500
# Descuento sobre el subtotal (con ofertas ya aplicadas) en la primera compra activa.
FIRST_PURCHASE_DISCOUNT_PERCENT = 15
# Niveles solo informativos: saldo mínimo de cada uno, de mayor a menor.
LEVELS = (("Oro", 1000), ("Plata", 300))
DEFAULT_LEVEL = "Bronce"


@dataclass(frozen=True)
class OrderAmounts:
    subtotal: float
    first_purchase_discount: float
    points_discount: float
    discount_amount: float
    total: float
    points_used: int
    points_earned: int


def points_value(points: int) -> float:
    """Pesos que descuentan esos puntos."""
    return float(points // REDEEM_BLOCK_POINTS * REDEEM_BLOCK_VALUE)


def calculate_order_amounts(
    subtotal: float, first_purchase: bool, balance: int, use_points: bool
) -> OrderAmounts:
    """Orden del cálculo: subtotal, 15%, canje, total y puntos ganados."""
    # En centavos enteros, para que el redondeo sea exacto e igual al del frontend.
    subtotal_cents = round(subtotal * 100)
    first_cents = 0
    if first_purchase:
        first_cents = (subtotal_cents * FIRST_PURCHASE_DISCOUNT_PERCENT + 50) // 100
    due_cents = subtotal_cents - first_cents

    blocks = 0
    if use_points and balance > 0:
        # Todos los bloques que alcancen, sin pasarse de lo que queda por pagar.
        blocks = min(balance // REDEEM_BLOCK_POINTS, due_cents // (REDEEM_BLOCK_VALUE * 100))
    points_cents = blocks * REDEEM_BLOCK_VALUE * 100
    total_cents = due_cents - points_cents

    return OrderAmounts(
        subtotal=subtotal_cents / 100,
        first_purchase_discount=first_cents / 100,
        points_discount=points_cents / 100,
        discount_amount=(first_cents + points_cents) / 100,
        total=total_cents / 100,
        points_used=blocks * REDEEM_BLOCK_POINTS,
        points_earned=total_cents // (PESOS_PER_POINT * 100),
    )


def level_for(balance: int) -> str:
    for name, minimum in LEVELS:
        if balance >= minimum:
            return name
    return DEFAULT_LEVEL
