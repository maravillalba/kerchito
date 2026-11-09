from datetime import datetime
from typing import get_args

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from points import points_value
from schemas import Category, OrderStatus, PaymentMethod, Role

CATEGORIES = get_args(Category)
_CATEGORIES_SQL = ", ".join(f"'{c}'" for c in CATEGORIES)
_ROLES_SQL = ", ".join(f"'{r}'" for r in get_args(Role))
_PAYMENT_METHODS_SQL = ", ".join(f"'{m}'" for m in get_args(PaymentMethod))
_ORDER_STATUSES_SQL = ", ".join(f"'{s}'" for s in get_args(OrderStatus))


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(trim(first_name)) > 0", name="ck_users_first_name_not_empty"),
        CheckConstraint("length(trim(last_name)) > 0", name="ck_users_last_name_not_empty"),
        CheckConstraint("email = lower(email)", name="ck_users_email_lowercase"),
        CheckConstraint(f"role IN ({_ROLES_SQL})", name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="customer")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )


class AuthSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    # Solo el hash: quien lea la base no puede usar los tokens.
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped["User"] = relationship()


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("length(trim(brand)) > 0", name="ck_products_brand_not_empty"),
        CheckConstraint("length(trim(name)) > 0", name="ck_products_name_not_empty"),
        CheckConstraint("length(trim(unit)) > 0", name="ck_products_unit_not_empty"),
        CheckConstraint(f"category IN ({_CATEGORIES_SQL})", name="ck_products_category"),
        CheckConstraint("price > 0", name="ck_products_price_positive"),
        CheckConstraint(
            "offer_price IS NULL OR (offer_price > 0 AND offer_price < price)",
            name="ck_products_offer_price_valid",
        ),
        CheckConstraint("stock >= 0", name="ck_products_stock_non_negative"),
        CheckConstraint("cost >= 0", name="ck_products_cost_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand: Mapped[str] = mapped_column(String, nullable=False)
    # Solo el producto, sin la marca ni la presentación.
    name: Mapped[str] = mapped_column(String, nullable=False)
    # Capacidad o presentación: "1,5 L", "1 kg", "500 ml", "x 20".
    unit: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    offer_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, nullable=False)
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image: Mapped[str | None] = mapped_column(String, nullable=True)

    @property
    def effective_price(self) -> float:
        """Precio que se cobra: el de oferta si existe, si no el normal."""
        return self.offer_price if self.offer_price is not None else self.price

    @property
    def full_name(self) -> str:
        """Marca, producto y presentación: "Coca-Cola Original 500 ml"."""
        return f"{self.brand} {self.name} {self.unit}"


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(f"payment_method IN ({_PAYMENT_METHODS_SQL})", name="ck_orders_payment_method"),
        CheckConstraint(f"status IN ({_ORDER_STATUSES_SQL})", name="ck_orders_status"),
        CheckConstraint("total >= 0", name="ck_orders_total_non_negative"),
        CheckConstraint("discount_amount >= 0", name="ck_orders_discount_non_negative"),
        CheckConstraint("points_used >= 0", name="ck_orders_points_used_non_negative"),
        CheckConstraint("points_earned >= 0", name="ck_orders_points_earned_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    payment_method: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    # first_purchase_discount + points_discount.
    discount_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    points_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total: Mapped[float] = mapped_column(Float, nullable=False)

    customer: Mapped["User"] = relationship()
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )

    @property
    def subtotal(self) -> float:
        return round(sum(item.quantity * item.unit_price for item in self.items), 2)

    @property
    def points_discount(self) -> float:
        return points_value(self.points_used)

    @property
    def first_purchase_discount(self) -> float:
        return round(self.discount_amount - self.points_discount, 2)


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity >= 1", name="ck_order_items_quantity_min"),
        CheckConstraint("unit_price > 0", name="ck_order_items_unit_price_positive"),
        CheckConstraint("unit_cost >= 0", name="ck_order_items_unit_cost_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    # Costo del producto al comprar: editar el costo no cambia la ganancia de ventas pasadas.
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()

    @property
    def product_name(self) -> str:
        return self.product.full_name


class PointsMovement(Base):
    __tablename__ = "points_movements"
    __table_args__ = (
        CheckConstraint("points <> 0", name="ck_points_movements_points_not_zero"),
        CheckConstraint("length(trim(reason)) > 0", name="ck_points_movements_reason_not_empty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    # Nulo en los ajustes manuales del admin.
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    # Con signo: positivo suma, negativo resta.
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )