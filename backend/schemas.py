from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Category = Literal[
    "bebidas",
    "golosinas_snacks",
    "lacteos",
    "almacen",
    "limpieza",
    "cigarrillos",
]


# Texto obligatorio: sin espacios al principio ni al final, y no vacío.
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ProductIn(BaseModel):
    """Datos de un producto. Hoy lo usa el seed para validar el catálogo."""

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
    image: str | None = None

    @model_validator(mode="after")
    def offer_below_price(self) -> Self:
        if self.offer_price is not None and self.offer_price >= self.price:
            raise ValueError("offer_price must be lower than price")
        return self


class _ProductId(BaseModel):
    id: int


# _ProductId va segundo en la herencia para que "id" quede primero en el JSON.
class ProductOut(ProductIn, _ProductId):
    model_config = ConfigDict(from_attributes=True)


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    quantity: int
    unit_price: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    total: float
    items: list[OrderItemOut]
    
class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=500)


class ChatResponse(BaseModel):
    reply: str