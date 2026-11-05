from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import seed
from models import Product

# frontend/public: las rutas de `image` las sirve el frontend desde acá.
FRONTEND_PUBLIC = Path(__file__).resolve().parents[2] / "frontend" / "public"


@pytest.fixture()
def seed_en_memoria(monkeypatch):
    # seed() usa el engine y la sesión de database.py (kiosco.db): se reemplazan
    # por una base en memoria para no tocar la base real.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(seed, "engine", engine)
    monkeypatch.setattr(seed, "SessionLocal", Session)
    yield Session
    engine.dispose()


def cargar_seed(seed_en_memoria):
    seed.seed()
    with seed_en_memoria() as db:
        return db.query(Product).order_by(Product.id).all()


def test_seed_carga_todos_los_productos_sin_repetir_nombres(seed_en_memoria):
    productos = cargar_seed(seed_en_memoria)

    assert len(productos) == len(seed.PRODUCTS)
    nombres = [p.name for p in productos]
    assert len(nombres) == len(set(nombres))


def test_seed_separa_marca_producto_y_presentacion(seed_en_memoria):
    productos = cargar_seed(seed_en_memoria)

    for p in productos:
        assert p.brand.strip() and p.name.strip() and p.unit.strip(), p.id
        # El nombre es solo el producto: no repite la marca.
        assert p.brand.lower() not in p.name.lower(), f"{p.id}: {p.brand} / {p.name}"
    # Marca + producto + presentación no se repite.
    completos = [p.full_name for p in productos]
    assert len(completos) == len(set(completos))


def test_seed_tiene_4_ofertas_entre_10_y_25_por_ciento(seed_en_memoria):
    productos = cargar_seed(seed_en_memoria)
    ofertas = [p for p in productos if p.offer_price is not None]

    assert {p.brand for p in ofertas} >= {"Coca-Cola", "Cruz de Malta", "Cif"}
    assert len(ofertas) == 4
    for p in ofertas:
        descuento = 1 - p.offer_price / p.price
        assert 0.10 <= descuento <= 0.25, f"{p.full_name}: {descuento:.1%}"


def test_seed_con_una_base_vieja_avisa_que_hay_que_borrarla(monkeypatch):
    # Tabla products de antes de brand / unit / offer_price.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE products (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, "
            "category VARCHAR NOT NULL, price FLOAT NOT NULL, stock INTEGER NOT NULL, "
            "description TEXT, image VARCHAR)"
        ))
    monkeypatch.setattr(seed, "engine", engine)
    monkeypatch.setattr(seed, "SessionLocal", sessionmaker(bind=engine))

    with pytest.raises(seed.OutdatedDatabaseError, match="brand, offer_price, unit"):
        seed.seed()
    engine.dispose()


def test_las_imagenes_del_seed_son_rutas_validas(seed_en_memoria):
    # `image` es opcional: los productos sin foto usan la de su categoría en el
    # frontend. Solo se revisan las rutas que el seed declara.
    productos = cargar_seed(seed_en_memoria)

    for producto in productos:
        if producto.image is None:
            continue
        assert producto.image.startswith("/productos/"), producto.name
        assert producto.image.endswith(".webp"), producto.name
        archivo = FRONTEND_PUBLIC / producto.image.lstrip("/")
        assert archivo.is_file(), f"{producto.name}: no existe {archivo}"
