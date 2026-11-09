"""Consultas sobre la cuenta de un cliente: saldo y primera compra."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models import Order, PointsMovement, User
from schemas import UserOut


def points_balance(db: Session, user_id: int) -> int:
    """El saldo es la suma de los movimientos. Puede ser negativo."""
    return db.scalar(
        select(func.coalesce(func.sum(PointsMovement.points), 0)).where(
            PointsMovement.user_id == user_id
        )
    )


def first_purchase_available(db: Session, user_id: int) -> bool:
    """Corresponde el 15% si el cliente no tiene ningún pedido activo."""
    return not db.scalar(
        select(
            select(Order.id)
            .where(Order.user_id == user_id, Order.status == "active")
            .exists()
        )
    )


def user_out(db: Session, user: User) -> UserOut:
    is_customer = user.role == "customer"
    return UserOut(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        created_at=user.created_at,
        points=points_balance(db, user.id) if is_customer else 0,
        first_purchase_available=is_customer and first_purchase_available(db, user.id),
    )
