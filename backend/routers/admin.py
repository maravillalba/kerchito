from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from accounts import points_balance
from database import get_db
from deps import require_admin
from models import Order, OrderItem, PointsMovement, Product, User
from points import level_for
from schemas import (
    AdminOrderOut,
    BestSellerOut,
    CustomerDetailOut,
    CustomerOut,
    PointsAdjustment,
    PointsMovementOut,
    ProductAdminOut,
    SummaryOut,
    TopCustomerOut,
)

# Todo este router es solo para el admin.
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

_TOP_SIZE = 5


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


@router.get("/summary", response_model=SummaryOut)
def summary(db: Session = Depends(get_db)):
    active = Order.status == "active"

    total_revenue = db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(active))
    gross_profit = db.scalar(
        select(
            func.coalesce(
                func.sum((OrderItem.unit_price - OrderItem.unit_cost) * OrderItem.quantity), 0
            )
        )
        .join(OrderItem.order)
        .where(active)
    )
    # Consulta aparte: en el JOIN de arriba, cada pedido se repetiría una vez por renglón.
    # discount_amount ya incluye el 15% y el valor de los puntos canjeados.
    discounts = db.scalar(select(func.coalesce(func.sum(Order.discount_amount), 0)).where(active))
    stock_units = db.scalar(select(func.coalesce(func.sum(Product.stock), 0)))
    points_in_circulation = db.scalar(select(func.coalesce(func.sum(PointsMovement.points), 0)))

    units_sold = func.sum(OrderItem.quantity)
    best_sellers = db.execute(
        select(Product, units_sold)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(OrderItem.order)
        .where(active)
        .group_by(Product.id)
        .order_by(units_sold.desc(), Product.id)
        .limit(_TOP_SIZE)
    ).all()

    points = func.sum(PointsMovement.points)
    top_customers = db.execute(
        select(User, points)
        .join(PointsMovement, PointsMovement.user_id == User.id)
        .where(User.role == "customer")
        .group_by(User.id)
        .having(points > 0)
        .order_by(points.desc(), User.id)
        .limit(_TOP_SIZE)
    ).all()

    return SummaryOut(
        total_revenue=round(total_revenue, 2),
        net_profit=round(gross_profit - discounts, 2),
        stock_units=stock_units,
        points_in_circulation=points_in_circulation,
        best_sellers=[
            BestSellerOut(product_id=p.id, product_name=p.full_name, units_sold=units)
            for p, units in best_sellers
        ],
        top_customers=[
            TopCustomerOut(id=u.id, first_name=u.first_name, last_name=u.last_name, points=balance)
            for u, balance in top_customers
        ],
    )


def _customer_out(user: User, points: int, orders_count: int, total_spent, last_order_at) -> CustomerOut:
    return CustomerOut(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
        points=points,
        level=level_for(points),
        orders_count=orders_count,
        total_spent=round(total_spent or 0, 2),
        last_order_at=last_order_at,
    )


def _order_stats_query():
    """Compras, gasto y última compra por cliente, solo de pedidos activos."""
    return select(
        Order.user_id, func.count(Order.id), func.sum(Order.total), func.max(Order.created_at)
    ).where(Order.status == "active")


@router.get("/customers", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    # Dos agrupaciones aparte: en un solo JOIN, cada pedido se multiplicaría por
    # la cantidad de movimientos y los totales darían de más.
    balances = dict(
        db.execute(
            select(PointsMovement.user_id, func.sum(PointsMovement.points)).group_by(
                PointsMovement.user_id
            )
        ).all()
    )
    stats = {
        user_id: (count, spent, last)
        for user_id, count, spent, last in db.execute(
            _order_stats_query().group_by(Order.user_id)
        ).all()
    }
    users = db.query(User).filter(User.role == "customer").order_by(User.id).all()
    return [
        _customer_out(u, balances.get(u.id, 0), *stats.get(u.id, (0, 0, None))) for u in users
    ]


def _customer_detail(db: Session, customer_id: int) -> CustomerDetailOut:
    user = db.get(User, customer_id)
    if user is None or user.role != "customer":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    _, count, spent, last = db.execute(
        _order_stats_query().where(Order.user_id == customer_id)
    ).one()
    movements = (
        db.query(PointsMovement)
        .filter(PointsMovement.user_id == customer_id)
        .order_by(PointsMovement.id.desc())
        .all()
    )
    customer = _customer_out(user, points_balance(db, customer_id), count, spent, last)
    return CustomerDetailOut(
        **customer.model_dump(),
        movements=[PointsMovementOut.model_validate(m) for m in movements],
    )


@router.get("/customers/{customer_id}", response_model=CustomerDetailOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    return _customer_detail(db, customer_id)


@router.post("/customers/{customer_id}/points", response_model=CustomerDetailOut, status_code=201)
def adjust_points(customer_id: int, data: PointsAdjustment, db: Session = Depends(get_db)):
    # Valida que exista antes de escribir.
    _customer_detail(db, customer_id)
    db.add(PointsMovement(user_id=customer_id, points=data.points, reason=data.reason))
    db.commit()
    return _customer_detail(db, customer_id)
