from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Category = Literal[
    "bebidas",
    "golosinas_snacks",
    "lacteos",
    "almacen",
    "limpieza",
    "cigarrillos",
]

Role = Literal["customer", "admin"]
PaymentMethod = Literal["efectivo", "transferencia", "tarjeta", "mercado_pago"]
OrderStatus = Literal["active", "cancelled"]


# Texto obligatorio: sin espacios al principio ni al final, y no vacío.
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

# Correo sin espacios y en minúsculas. El formato se revisa por arriba a propósito:
# la única prueba real de un correo es escribirle.
Email = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    ),
]


class RegisterIn(BaseModel):
    first_name: NonEmptyStr
    last_name: NonEmptyStr
    email: Email
    phone: str | None = None
    password: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def blank_phone_is_null(cls, phone: str | None) -> str | None:
        return (phone or "").strip() or None


class LoginIn(BaseModel):
    # Sin validar el formato: un correo mal escrito es un login incorrecto más.
    email: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True)]
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str | None
    role: Role
    created_at: datetime
    points: int
    first_purchase_available: bool


class AuthOut(BaseModel):
    token: str
    expires_at: datetime
    user: UserOut


class _ProductData(BaseModel):
    """Los campos de un producto que valen tanto para el catálogo como para el admin."""

    brand: NonEmptyStr
    # Solo el producto, sin la marca ni la presentación: "Original", "Yerba mate".
    name: NonEmptyStr
    # Capacidad o presentación: "1,5 L", "1 kg", "500 ml", "x 20".
    unit: NonEmptyStr
    category: Category
    price: float = Field(gt=0)
    # Precio de oferta (opcional). Si está, el pedido cobra este precio.
    offer_price: float | None = Field(default=None, gt=0)
    stock: int = Field(ge=0)
    description: str | None = None

    @model_validator(mode="after")
    def offer_below_price(self) -> Self:
        if self.offer_price is not None and self.offer_price >= self.price:
            raise ValueError("offer_price must be lower than price")
        return self


class ProductIn(_ProductData):
    """Producto del catálogo. Lo usa el seed para validar sus datos."""

    image: str | None = None


class _ProductId(BaseModel):
    id: int


# _ProductId va segundo en la herencia para que "id" quede primero en el JSON.
class ProductOut(ProductIn, _ProductId):
    """Lo que ve cualquiera: no incluye cost."""

    model_config = ConfigDict(from_attributes=True)


class ProductAdminIn(_ProductData):
    """Lo que manda el admin. La foto no va acá: tiene su propio endpoint."""

    cost: float = Field(ge=0)


class ProductAdminOut(ProductOut):
    cost: float


class StockUpdate(BaseModel):
    stock: int = Field(ge=0)


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)
    payment_method: PaymentMethod
    use_points: bool = False


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    status: OrderStatus
    payment_method: PaymentMethod
    subtotal: float
    first_purchase_discount: float
    points_discount: float
    discount_amount: float
    total: float
    points_used: int
    points_earned: int
    items: list[OrderItemOut]


class OrderCreatedOut(OrderOut):
    points_balance: int


class OrderCustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str


class AdminOrderOut(OrderOut):
    customer: OrderCustomerOut


class BestSellerOut(BaseModel):
    product_id: int
    product_name: str
    units_sold: int


class TopCustomerOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    points: int
    orders_count: int


class SummaryOut(BaseModel):
    total_revenue: float
    net_profit: float
    stock_units: int
    points_in_circulation: int
    best_sellers: list[BestSellerOut]
    top_customers: list[TopCustomerOut]


class CustomerOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str | None
    created_at: datetime
    points: int
    level: str
    orders_count: int
    total_spent: float
    last_order_at: datetime | None


class PointsMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int | None
    points: int
    reason: str
    created_at: datetime


class CustomerDetailOut(CustomerOut):
    movements: list[PointsMovementOut]


class PointsAdjustment(BaseModel):
    points: int
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]

    @field_validator("points")
    @classmethod
    def points_not_zero(cls, points: int) -> int:
        if points == 0:
            raise ValueError("points must not be 0")
        return points


class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=500)


class ChatResponse(BaseModel):
    reply: str