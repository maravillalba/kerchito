from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session, selectinload

from accounts import first_purchase_available, points_balance
from database import get_db
from deps import require_admin, require_customer
from models import Order, OrderItem, PointsMovement, Product, User
from points import calculate_order_amounts
from schemas import AdminOrderOut, OrderCreate, OrderCreatedOut, OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])

_WITH_ITEMS = selectinload(Order.items).selectinload(OrderItem.product)


@router.get("", response_model=list[OrderOut], dependencies=[Depends(require_admin)])
def list_orders(db: Session = Depends(get_db)):
    return db.query(Order).options(_WITH_ITEMS).order_by(Order.id.desc()).all()


@router.get("/mine", response_model=list[OrderOut])
def list_my_orders(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(_WITH_ITEMS)
        .filter(Order.user_id == user.id)
        .order_by(Order.id.desc())
        .all()
    )


@router.post("", response_model=OrderCreatedOut, status_code=201)
def create_order(
    order_in: OrderCreate,
    user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    try:
        items = []
        subtotal = 0.0
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

            # El precio lo decide siempre el backend: el de oferta si existe, si no el normal.
            unit_price = product.effective_price
            items.append(
                OrderItem(product_id=product.id, quantity=item.quantity, unit_price=unit_price)
            )
            subtotal += item.quantity * unit_price

        # Se lee después de los UPDATE a propósito: la transacción ya tiene el lock de
        # escritura de SQLite, así que dos pedidos simultáneos no pueden gastar los
        # mismos puntos ni llevarse los dos el 15%.
        amounts = calculate_order_amounts(
            subtotal,
            first_purchase_available(db, user.id),
            points_balance(db, user.id),
            order_in.use_points,
        )
        order = Order(
            user_id=user.id,
            payment_method=order_in.payment_method,
            discount_amount=amounts.discount_amount,
            points_used=amounts.points_used,
            points_earned=amounts.points_earned,
            total=amounts.total,
            items=items,
        )
        db.add(order)
        db.flush()  # Para tener order.id en los movimientos.

        if amounts.points_used:
            db.add(
                PointsMovement(
                    user_id=user.id,
                    order_id=order.id,
                    points=-amounts.points_used,
                    reason=f"Canje en el pedido #{order.id}",
                )
            )
        if amounts.points_earned:
            db.add(
                PointsMovement(
                    user_id=user.id,
                    order_id=order.id,
                    points=amounts.points_earned,
                    reason=f"Compra del pedido #{order.id}",
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    return OrderCreatedOut(
        **OrderOut.model_validate(order).model_dump(),
        points_balance=points_balance(db, user.id),
    )


@router.patch(
    "/{order_id}/cancel", response_model=AdminOrderOut, dependencies=[Depends(require_admin)]
)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    try:
        # UPDATE condicional: de dos anulaciones simultáneas, solo una pasa.
        result = db.execute(
            update(Order)
            .where(Order.id == order_id, Order.status == "active")
            .values(status="cancelled")
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=409, detail="El pedido ya está anulado")

        for item in order.items:
            db.execute(
                update(Product)
                .where(Product.id == item.product_id)
                .values(stock=Product.stock + item.quantity)
            )

        # No se limita al saldo: si ya gastó lo que ganó, queda en negativo. El 15% no
        # hay que restaurarlo porque se calcula sobre los pedidos activos.
        if order.points_earned:
            db.add(
                PointsMovement(
                    user_id=order.user_id,
                    order_id=order.id,
                    points=-order.points_earned,
                    reason=f"Anulación del pedido #{order.id}: se revierten los puntos ganados",
                )
            )
        if order.points_used:
            db.add(
                PointsMovement(
                    user_id=order.user_id,
                    order_id=order.id,
                    points=order.points_used,
                    reason=f"Anulación del pedido #{order.id}: se devuelven los puntos usados",
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    return order
