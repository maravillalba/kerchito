from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import uploads
from database import get_db
from deps import require_admin
from models import OrderItem, Product
from schemas import Category, ProductAdminIn, ProductAdminOut, ProductOut, StockUpdate

router = APIRouter(prefix="/api/products", tags=["products"])

_PRODUCT_IN_ORDER = (
    "No se puede borrar: el producto ya está en un pedido. Podés dejarlo sin stock."
)


def _get_or_404(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product


@router.get("", response_model=list[ProductOut])
def list_products(category: Category | None = None, db: Session = Depends(get_db)):
    query = db.query(Product)
    if category is not None:
        query = query.filter(Product.category == category)
    return query.order_by(Product.id).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, product_id)


@router.post(
    "",
    response_model=ProductAdminOut,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def create_product(data: ProductAdminIn, db: Session = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    return product


@router.put(
    "/{product_id}", response_model=ProductAdminOut, dependencies=[Depends(require_admin)]
)
def update_product(product_id: int, data: ProductAdminIn, db: Session = Depends(get_db)):
    product = _get_or_404(db, product_id)
    for field, value in data.model_dump().items():
        setattr(product, field, value)
    db.commit()
    return product


@router.delete("/{product_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = _get_or_404(db, product_id)
    if db.query(OrderItem).filter(OrderItem.product_id == product_id).first() is not None:
        raise HTTPException(status_code=409, detail=_PRODUCT_IN_ORDER)

    image = product.image
    db.delete(product)
    try:
        db.commit()
    except IntegrityError:
        # Entró un pedido entre el chequeo y el borrado: lo frena la FK.
        db.rollback()
        raise HTTPException(status_code=409, detail=_PRODUCT_IN_ORDER) from None
    uploads.delete_uploaded_image(image)
    return Response(status_code=204)


@router.patch(
    "/{product_id}/stock", response_model=ProductAdminOut, dependencies=[Depends(require_admin)]
)
def update_stock(product_id: int, data: StockUpdate, db: Session = Depends(get_db)):
    product = _get_or_404(db, product_id)
    product.stock = data.stock
    db.commit()
    return product


@router.post(
    "/{product_id}/image", response_model=ProductAdminOut, dependencies=[Depends(require_admin)]
)
def upload_image(product_id: int, file: UploadFile, db: Session = Depends(get_db)):
    product = _get_or_404(db, product_id)

    # Se lee un byte de más para detectar el exceso sin cargar un archivo enorme.
    content = file.file.read(uploads.MAX_IMAGE_BYTES + 1)
    if len(content) > uploads.MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=uploads.TOO_LARGE_MESSAGE)
    extension = uploads.image_extension(content)
    if extension is None:
        raise HTTPException(status_code=415, detail="La foto tiene que ser JPG, PNG o WebP")

    previous = product.image
    new_image = uploads.save_product_image(content, extension)
    product.image = new_image
    try:
        db.commit()
    except Exception:
        db.rollback()
        uploads.delete_uploaded_image(new_image)
        raise
    # Recién con la base actualizada: si falla antes, la foto anterior sigue en uso.
    uploads.delete_uploaded_image(previous)
    return product
