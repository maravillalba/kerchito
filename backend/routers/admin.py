from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from deps import require_admin
from models import Product
from schemas import ProductAdminOut

# Todo este router es solo para el admin.
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/products", response_model=list[ProductAdminOut])
def list_products_with_cost(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id).all()
