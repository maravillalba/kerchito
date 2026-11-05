from datetime import datetime
from typing import get_args

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from schemas import Category

CATEGORIES = get_args(Category)
_CATEGORIES_SQL = ", ".join(f"'{c}'" for c in CATEGORIES)


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

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )
    total: Mapped[float] = mapped_column(Float, nullable=False)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity >= 1", name="ck_order_items_quantity_min"),
        CheckConstraint("unit_price > 0", name="ck_order_items_unit_price_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()