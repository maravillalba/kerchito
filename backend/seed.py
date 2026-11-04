from database import Base, SessionLocal, engine
import models  # noqa: F401  (registra las tablas en Base.metadata)
from models import Product

PRODUCTS = [
    {"name": "Coca-Cola 500ml", "category": "bebidas", "price": 1200, "stock": 25, "description": "Gaseosa clásica", "image": "/productos/coca-cola.webp"},
    {"name": "Agua mineral 500ml", "category": "bebidas", "price": 800, "stock": 40, "description": "Agua sin gas", "image": "/productos/agua-mineral.webp"},
    {"name": "Papas Lays Clásicas", "category": "golosinas_snacks", "price": 1500, "stock": 30, "description": "Papas fritas clásicas", "image": "/productos/papas-lays.webp"},
    {"name": "Alfajor Jorgito", "category": "golosinas_snacks", "price": 1100, "stock": 50, "description": "Alfajor de chocolate", "image": "/productos/alfajor-jorgito.webp"},
    {"name": "Leche entera 1L", "category": "lacteos", "price": 1300, "stock": 20, "description": "Leche entera larga vida", "image": "/productos/leche-entera.webp"},
    {"name": "Yogur firme frutilla", "category": "lacteos", "price": 900, "stock": 18, "description": "Yogur firme sabor frutilla", "image": "/productos/yogur-frutilla.webp"},
    {"name": "Fideos tirabuzón 500g", "category": "almacen", "price": 1400, "stock": 30, "description": "Fideos secos", "image": "/productos/fideos-tirabuzon.webp"},
    {"name": "Galletitas de agua", "category": "almacen", "price": 1000, "stock": 35, "description": "Paquete de galletitas de agua", "image": "/productos/galletitas-de-agua.webp"},
    {"name": "Lavandina 1L", "category": "limpieza", "price": 1600, "stock": 15, "description": "Lavandina para el hogar", "image": "/productos/lavandina.webp"},
    {"name": "Cigarrillos", "category": "cigarrillos", "price": 2500, "stock": 20, "description": "Atado de cigarrillos", "image": "/productos/cigarrillos.webp"},
    {"name": "Yerba mate 500 g", "category": "almacen", "price": 1900, "stock": 30, "description": "Yerba mate con palo", "image": None},
    {"name": "Azúcar 1 kg", "category": "almacen", "price": 1100, "stock": 25, "description": "Azúcar común tipo A", "image": None},
    {"name": "Aceite de girasol 900 ml", "category": "almacen", "price": 2100, "stock": 20, "description": "Aceite de girasol para cocinar", "image": None},
    {"name": "Arroz largo fino 1 kg", "category": "almacen", "price": 1300, "stock": 25, "description": "Arroz largo fino", "image": None},
    {"name": "Puré de tomate 520 g", "category": "almacen", "price": 800, "stock": 30, "description": "Puré de tomate en caja", "image": None},
    {"name": "Gaseosa lima-limón 500 ml", "category": "bebidas", "price": 1100, "stock": 30, "description": "Gaseosa sabor lima-limón", "image": None},
    {"name": "Jugo de naranja 1 L", "category": "bebidas", "price": 1500, "stock": 20, "description": "Jugo de naranja listo para tomar", "image": None},
    {"name": "Agua saborizada pomelo 500 ml", "category": "bebidas", "price": 1000, "stock": 25, "description": "Agua saborizada sabor pomelo", "image": None},
    {"name": "Cerveza rubia lata 473 ml", "category": "bebidas", "price": 1700, "stock": 40, "description": "Cerveza rubia en lata", "image": None},
    {"name": "Fernet 750 ml", "category": "bebidas", "price": 9500, "stock": 10, "description": "Fernet para preparar con cola", "image": None},
    {"name": "Vino tinto malbec 750 ml", "category": "bebidas", "price": 3800, "stock": 12, "description": "Vino tinto malbec", "image": None},
    {"name": "Alfajor triple de dulce de leche", "category": "golosinas_snacks", "price": 1300, "stock": 40, "description": "Alfajor triple bañado en chocolate", "image": None},
    {"name": "Caramelos masticables x 10", "category": "golosinas_snacks", "price": 500, "stock": 40, "description": "Caramelos masticables de frutas", "image": None},
    {"name": "Chicles de menta x 5", "category": "golosinas_snacks", "price": 600, "stock": 35, "description": "Chicles sabor menta", "image": None},
    {"name": "Turrón de maní 25 g", "category": "golosinas_snacks", "price": 400, "stock": 40, "description": "Turrón de maní y miel", "image": None},
    {"name": "Queso cremoso 500 g", "category": "lacteos", "price": 4500, "stock": 10, "description": "Queso cremoso en horma", "image": None},
    {"name": "Manteca 200 g", "category": "lacteos", "price": 2300, "stock": 15, "description": "Manteca en pan", "image": None},
    {"name": "Dulce de leche 400 g", "category": "lacteos", "price": 2400, "stock": 20, "description": "Dulce de leche clásico", "image": None},
    {"name": "Crema de leche 200 ml", "category": "lacteos", "price": 1600, "stock": 12, "description": "Crema de leche para cocinar", "image": None},
    {"name": "Detergente 500 ml", "category": "limpieza", "price": 1400, "stock": 20, "description": "Detergente para vajilla", "image": None},
    {"name": "Jabón en polvo 800 g", "category": "limpieza", "price": 3200, "stock": 12, "description": "Jabón en polvo para lavar la ropa", "image": None},
    {"name": "Papel higiénico x 4", "category": "limpieza", "price": 2600, "stock": 20, "description": "Papel higiénico, 4 rollos", "image": None},
    {"name": "Esponja doble faz", "category": "limpieza", "price": 600, "stock": 30, "description": "Esponja de cocina doble faz", "image": None},
    {"name": "Cigarrillos mentolados x 20", "category": "cigarrillos", "price": 2700, "stock": 15, "description": "Atado de cigarrillos mentolados", "image": None},
    {"name": "Tabaco para armar 30 g", "category": "cigarrillos", "price": 3000, "stock": 8, "description": "Tabaco para armar cigarrillos", "image": None},
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(Product).count() > 0:
            print("La tabla products ya tiene datos: no se carga nada.")
            return
        db.add_all([Product(**p) for p in PRODUCTS])
        db.commit()
        print(f"Se cargaron {len(PRODUCTS)} productos.")


if __name__ == "__main__":
    seed()