from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from database import get_db
from deps import require_admin
from models import Order, OrderItem, Product
from schemas import AdminOrderOut, ProductAdminOut

# Todo este router es solo para el admin.
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/products", response_model=list[ProductAdminOut])
def list_products_with_cost(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id).all()


@router.get("/orders", response_model=list[AdminOrderOut])
def list_orders_with_customer(db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .order_by(Order.id.desc())
        .all()
    )
