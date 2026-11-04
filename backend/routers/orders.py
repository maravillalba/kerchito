from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Order, OrderItem, Product
from schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.query(Order).options(selectinload(Order.items)).order_by(Order.id.desc()).all()


@router.post("", response_model=OrderOut, status_code=201)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    try:
        items = []
        total = 0.0
        for item in order_in.items:
            product = db.get(Product, item.product_id)
            if product is None:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

            # UPDATE condicional: verifica y descuenta en un solo paso, así dos pedidos
            # simultáneos no pueden pasar el chequeo a la vez. Con product_id repetidos
            # el descuento se acumula.
            result = db.execute(
                update(Product)
                .where(Product.id == item.product_id, Product.stock >= item.quantity)
                .values(stock=Product.stock - item.quantity)
            )
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=409, detail=f"Insufficient stock for product {item.product_id}"
                )

            items.append(
                OrderItem(product_id=product.id, quantity=item.quantity, unit_price=product.price)
            )
            total += item.quantity * product.price

        order = Order(total=round(total, 2), items=items)
        db.add(order)
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    return order
