import os

from sqlalchemy import inspect

from database import Base, SessionLocal, engine
import models  # noqa: F401  (registra las tablas en Base.metadata)
from models import Product, User
from schemas import ProductIn
from security import hash_password

MIN_PASSWORD_LENGTH = 8

PRODUCTS = [
    {"brand": "Coca-Cola", "name": "Original", "unit": "500 ml", "category": "bebidas", "price": 1200, "offer_price": 1000, "stock": 25, "description": "Gaseosa clásica", "image": "/productos/coca-cola.webp"},
    {"brand": "El Rápido", "name": "Agua mineral sin gas", "unit": "500 ml", "category": "bebidas", "price": 800, "stock": 40, "description": "Agua sin gas", "image": "/productos/agua-mineral.webp"},
    {"brand": "Lay's", "name": "Papas fritas clásicas", "unit": "1 u.", "category": "golosinas_snacks", "price": 1500, "stock": 30, "description": "Papas fritas clásicas", "image": "/productos/papas-lays.webp"},
    {"brand": "Jorgito", "name": "Alfajor", "unit": "55 g", "category": "golosinas_snacks", "price": 1100, "stock": 50, "description": "Alfajor de chocolate", "image": "/productos/alfajor-jorgito.webp"},
    {"brand": "El Rápido", "name": "Leche entera", "unit": "1 L", "category": "lacteos", "price": 1300, "stock": 20, "description": "Leche entera larga vida", "image": "/productos/leche-entera.webp"},
    {"brand": "El Rápido", "name": "Yogur firme frutilla", "unit": "1 u.", "category": "lacteos", "price": 900, "stock": 18, "description": "Yogur firme sabor frutilla", "image": "/productos/yogur-frutilla.webp"},
    {"brand": "Don Felipe", "name": "Fideos tirabuzón al huevo", "unit": "500 g", "category": "almacen", "price": 1400, "stock": 30, "description": "Fideos secos", "image": "/productos/fideos-tirabuzon.webp"},
    {"brand": "El Rápido", "name": "Galletitas de agua", "unit": "1 u.", "category": "almacen", "price": 1000, "stock": 35, "description": "Paquete de galletitas de agua", "image": "/productos/galletitas-de-agua.webp"},
    {"brand": "Ayudín", "name": "Lavandina clásica", "unit": "1 L", "category": "limpieza", "price": 1600, "stock": 15, "description": "Lavandina para el hogar", "image": "/productos/lavandina.webp"},
    {"brand": "Benson", "name": "Cigarrillos", "unit": "x 20", "category": "cigarrillos", "price": 2500, "stock": 20, "description": "Atado de cigarrillos", "image": "/productos/cigarrillos.webp"},
    {"brand": "Cruz de Malta", "name": "Yerba mate", "unit": "500 g", "category": "almacen", "price": 1900, "offer_price": 1600, "stock": 30, "description": "Yerba mate con palo", "image": "/productos/yerba-cruz-de-malta.webp"},
    {"brand": "Chasqui", "name": "Azúcar", "unit": "1 kg", "category": "almacen", "price": 1390, "stock": 25, "description": "Azúcar blanca común", "image": "/productos/azucar-chasqui.webp"},
    {"brand": "Marolio", "name": "Aceite de girasol", "unit": "900 ml", "category": "almacen", "price": 2100, "stock": 20, "description": "Aceite de girasol para cocinar", "image": "/productos/aceite-marolio.webp"},
    {"brand": "Lucchetti", "name": "Arroz largo fino", "unit": "1 kg", "category": "almacen", "price": 2270, "stock": 25, "description": "Arroz largo fino", "image": "/productos/arroz-lucchetti.webp"},
    {"brand": "De la Huerta", "name": "Puré de tomate", "unit": "530 g", "category": "almacen", "price": 1120, "stock": 30, "description": "Puré de tomate en caja", "image": "/productos/pure-tomate-de-la-huerta.webp"},
    {"brand": "Sprite", "name": "Gaseosa lima-limón", "unit": "500 ml", "category": "bebidas", "price": 1100, "stock": 30, "description": "Gaseosa sabor lima-limón", "image": "/productos/gaseosa-sprite.webp"},
    {"brand": "Watt's", "name": "Jugo de naranja", "unit": "1 L", "category": "bebidas", "price": 1500, "stock": 20, "description": "Jugo de naranja listo para tomar", "image": "/productos/jugo-watts-naranja.webp"},
    {"brand": "Aquarius", "name": "Agua saborizada pomelo", "unit": "500 ml", "category": "bebidas", "price": 1000, "stock": 25, "description": "Agua saborizada sabor pomelo", "image": "/productos/agua-aquarius-pomelo.webp"},
    {"brand": "Andes Origen", "name": "Cerveza rubia en lata", "unit": "473 ml", "category": "bebidas", "price": 1700, "stock": 40, "description": "Cerveza rubia en lata", "image": "/productos/cerveza-andes-rubia.webp"},
    {"brand": "Branca", "name": "Fernet", "unit": "750 ml", "category": "bebidas", "price": 9500, "stock": 10, "description": "Fernet para preparar con cola", "image": "/productos/fernet-branca.webp"},
    {"brand": "Muñeco Rebelde", "name": "Vino tinto malbec", "unit": "750 ml", "category": "bebidas", "price": 3800, "stock": 12, "description": "Vino tinto malbec", "image": "/productos/vino-muneco-rebelde.webp"},
    {"brand": "Milka", "name": "Alfajor Mousse triple", "unit": "1 u.", "category": "golosinas_snacks", "price": 1300, "stock": 40, "description": "Alfajor triple de chocolate con mousse", "image": "/productos/alfajor-milka-mousse.webp"},
    {"brand": "Pico Dulce", "name": "Caramelos duros", "unit": "150 g", "category": "golosinas_snacks", "price": 1500, "stock": 40, "description": "Caramelos duros, bolsa de 150 g", "image": "/productos/caramelos-pico-dulce.webp"},
    {"brand": "Beldent", "name": "Chicles de menta", "unit": "x 6", "category": "golosinas_snacks", "price": 600, "stock": 35, "description": "Chicles sabor menta", "image": "/productos/chicles-beldent-menta.webp"},
    {"brand": "Arcor", "name": "Turrón y maní", "unit": "25 g", "category": "golosinas_snacks", "price": 400, "stock": 40, "description": "Turrón con maní", "image": "/productos/turron-arcor-mani.webp"},
    {"brand": "La Paulina", "name": "Queso cremoso tradicional", "unit": "500 g", "category": "lacteos", "price": 4500, "stock": 10, "description": "Queso cremoso", "image": "/productos/queso-cremoso-la-paulina.webp"},
    {"brand": "Cremigal", "name": "Manteca", "unit": "200 g", "category": "lacteos", "price": 2300, "stock": 15, "description": "Manteca en pan", "image": "/productos/manteca-cremigal.webp"},
    {"brand": "Vacalin", "name": "Dulce de leche", "unit": "400 g", "category": "lacteos", "price": 2400, "stock": 20, "description": "Dulce de leche clásico", "image": "/productos/dulce-de-leche-vacalin.webp"},
    {"brand": "Cremac", "name": "Crema de leche", "unit": "1 u.", "category": "lacteos", "price": 1600, "stock": 12, "description": "Crema de leche para cocinar", "image": "/productos/crema-cremac.webp"},
    {"brand": "Cif", "name": "Detergente Active Gel limón", "unit": "500 ml", "category": "limpieza", "price": 1400, "offer_price": 1200, "stock": 20, "description": "Detergente para vajilla en gel, aroma limón", "image": "/productos/detergente-cif-limon.webp"},
    {"brand": "Ala", "name": "Jabón en polvo Matic", "unit": "800 g", "category": "limpieza", "price": 3200, "stock": 12, "description": "Jabón en polvo para lavarropas", "image": "/productos/jabon-polvo-ala.webp"},
    {"brand": "Higienol", "name": "Papel higiénico Texturado", "unit": "4 x 30 m", "category": "limpieza", "price": 1870, "stock": 20, "description": "Papel higiénico texturado, 4 rollos de 30 m", "image": "/productos/papel-higienol-texturado.webp"},
    {"brand": "Piur", "name": "Esponjas de cocina", "unit": "x 2", "category": "limpieza", "price": 600, "stock": 30, "description": "Esponjas de cocina, 2 unidades", "image": "/productos/esponjas-piur.webp"},
    {"brand": "Melbourne", "name": "Cigarrillos mentolados", "unit": "x 20", "category": "cigarrillos", "price": 2700, "stock": 15, "description": "Atado de cigarrillos mentolados", "image": "/productos/cigarrillos-melbourne.webp"},
    {"brand": "JBR", "name": "Tabaco para armar Original", "unit": "30 g", "category": "cigarrillos", "price": 3000, "stock": 8, "description": "Tabaco para armar cigarrillos", "image": "/productos/tabaco-jbr-original.webp"},
    {"brand": "La Serenísima", "name": "Leche zero lactosa", "unit": "1 L", "category": "lacteos", "price": 2960, "stock": 12, "description": "Leche larga vida sin lactosa", "image": "/productos/leche-zero-lactosa.webp"},
    {"brand": "Favorita", "name": "Fideos tallarín", "unit": "500 g", "category": "almacen", "price": 1170, "stock": 30, "description": "Fideos secos tallarín", "image": "/productos/fideos-favorita-tallarin.webp"},
    {"brand": "Matarazzo", "name": "Fideos spaghetti", "unit": "500 g", "category": "almacen", "price": 1960, "stock": 30, "description": "Fideos secos spaghetti", "image": "/productos/fideos-matarazzo-spaghetti.webp"},
    {"brand": "Favorita", "name": "Harina 000", "unit": "1 kg", "category": "almacen", "price": 1260, "stock": 25, "description": "Harina de trigo 000", "image": "/productos/harina-favorita-000.webp"},
    {"brand": "Traviata", "name": "Galletitas sabor original", "unit": "x 5", "category": "almacen", "price": 3610, "stock": 30, "description": "Galletitas crackers, 5 paquetes", "image": "/productos/galletitas-traviata.webp"},
    {"brand": "Celusal", "name": "Sal fina", "unit": "500 g", "category": "almacen", "price": 1530, "stock": 25, "description": "Sal fina de mesa", "image": "/productos/sal-celusal-fina.webp"},
    {"brand": "La Española", "name": "Lentejas", "unit": "400 g", "category": "almacen", "price": 1660, "stock": 20, "description": "Lentejas secas", "image": "/productos/lentejas-la-espanola.webp"},
    {"brand": "Hellmann's", "name": "Mayonesa clásica", "unit": "475 g", "category": "almacen", "price": 3100, "offer_price": 2600, "stock": 15, "description": "Mayonesa clásica", "image": "/productos/mayonesa-hellmanns.webp"},
    {"brand": "Bonafide", "name": "Café Sensaciones intenso en sobres", "unit": "20 x 5 g", "category": "almacen", "price": 4510, "stock": 15, "description": "Café molido intenso en sobres", "image": "/productos/cafe-bonafide-sensaciones.webp"},
    {"brand": "Higienol", "name": "Papel higiénico Fresh", "unit": "4 x 30 m", "category": "limpieza", "price": 2340, "stock": 20, "description": "Papel higiénico perfumado, 4 rollos de 30 m", "image": "/productos/papel-higienol-fresh.webp"},
    {"brand": "Higienol", "name": "Papel higiénico Plus doble hoja", "unit": "4 x 30 m", "category": "limpieza", "price": 3450, "stock": 15, "description": "Papel higiénico doble hoja, 4 rollos de 30 m", "image": "/productos/papel-higienol-plus.webp"},
    {"brand": "Higienol", "name": "Papel higiénico Max hoja simple", "unit": "4 x 50 m", "category": "limpieza", "price": 3500, "stock": 15, "description": "Papel higiénico hoja simple, 4 rollos de 50 m", "image": "/productos/papel-higienol-max.webp"},
    {"brand": "Sussex", "name": "Rollo de cocina clásico", "unit": "x 3", "category": "limpieza", "price": 2660, "stock": 18, "description": "Rollos de papel de cocina, 3 unidades", "image": "/productos/rollo-cocina-sussex.webp"},
    {"brand": "Ayudín", "name": "Lavandina en gel cítrica", "unit": "700 ml", "category": "limpieza", "price": 3810, "stock": 12, "description": "Lavandina en gel aroma cítrico", "image": "/productos/lavandina-gel-ayudin.webp"},
    {"brand": "Ayudín", "name": "Quitamanchas ropa colores vivos", "unit": "400 ml", "category": "limpieza", "price": 1940, "stock": 15, "description": "Quitamanchas para ropa de color", "image": "/productos/quitamanchas-ayudin.webp"},
    {"brand": "San Iginio", "name": "Alcohol etílico 96°", "unit": "500 ml", "category": "limpieza", "price": 2250, "stock": 20, "description": "Alcohol etílico 96°", "image": "/productos/alcohol-san-iginio.webp"},
    {"brand": "Virulana", "name": "Esponja lisa", "unit": "1 u.", "category": "limpieza", "price": 950, "stock": 30, "description": "Esponja de cocina lisa", "image": "/productos/esponja-virulana-lisa.webp"},
    {"brand": "Media Naranja", "name": "Trapo de piso gris reforzado", "unit": "48 x 60 cm", "category": "limpieza", "price": 2130, "stock": 15, "description": "Trapo de piso gris reforzado", "image": "/productos/trapo-piso-media-naranja.webp"},
    {"brand": "El Rápido", "name": "Bolsas de consorcio 60 x 90 cm", "unit": "x 10", "category": "limpieza", "price": 1700, "stock": 25, "description": "Bolsas de residuos de 60 x 90 cm, 10 unidades", "image": "/productos/bolsas-consorcio.webp"},
]


class OutdatedDatabaseError(RuntimeError):
    """La base existente no tiene las columnas que espera el modelo actual."""


def _check_products_columns() -> None:
    # create_all no agrega columnas a una tabla que ya existe: una kiosco.db
    # anterior (sin brand, unit u offer_price) rompería cada consulta.
    existing = {c["name"] for c in inspect(engine).get_columns("products")}
    missing = set(Product.__table__.columns.keys()) - existing
    if missing:
        raise OutdatedDatabaseError(
            "La base de datos es de una versión anterior: a la tabla products le "
            f"faltan las columnas {', '.join(sorted(missing))}. Frená el servidor, "
            "borrá backend/kiosco.db y volvé a arrancarlo para cargar el seed nuevo."
        )


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    _check_products_columns()
    with SessionLocal() as db:
        if db.query(Product).count() > 0:
            print("La tabla products ya tiene datos: no se carga nada.")
            return
        # Cada producto pasa por ProductIn: marca, presentación y oferta válidas.
        db.add_all([Product(**ProductIn(**p).model_dump()) for p in PRODUCTS])
        db.commit()
        print(f"Se cargaron {len(PRODUCTS)} productos.")


def seed_admin() -> None:
    """Crea el admin desde ADMIN_EMAIL y ADMIN_PASSWORD. Nunca imprime esos valores."""
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    if not email or not password:
        print("Sin ADMIN_EMAIL o ADMIN_PASSWORD en el .env: no se crea el admin.")
        return
    if len(password) < MIN_PASSWORD_LENGTH:
        print(f"ADMIN_PASSWORD tiene menos de {MIN_PASSWORD_LENGTH} caracteres: no se crea el admin.")
        return

    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == email).first()
        if existing is not None:
            if existing.role != "admin":
                print("ADMIN_EMAIL ya pertenece a un cliente: no se crea el admin.")
            return
        db.add(
            User(
                first_name="Admin",
                last_name="Kiosko",
                email=email,
                password_hash=hash_password(password),
                role="admin",
            )
        )
        db.commit()
        print("Se creó el usuario administrador.")


if __name__ == "__main__":
    seed()
    seed_admin()