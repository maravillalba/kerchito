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
    {"name": "Lavandina Ayudín clásica 1 L", "category": "limpieza", "price": 1600, "stock": 15, "description": "Lavandina para el hogar", "image": "/productos/lavandina.webp"},
    {"name": "Cigarrillos", "category": "cigarrillos", "price": 2500, "stock": 20, "description": "Atado de cigarrillos", "image": "/productos/cigarrillos.webp"},
    {"name": "Yerba mate Cruz de Malta 500 g", "category": "almacen", "price": 1900, "stock": 30, "description": "Yerba mate con palo", "image": "/productos/yerba-cruz-de-malta.webp"},
    {"name": "Azúcar Chasqui 1 kg", "category": "almacen", "price": 1390, "stock": 25, "description": "Azúcar blanca común", "image": "/productos/azucar-chasqui.webp"},
    {"name": "Aceite de girasol Marolio 900 ml", "category": "almacen", "price": 2100, "stock": 20, "description": "Aceite de girasol para cocinar", "image": "/productos/aceite-marolio.webp"},
    {"name": "Arroz Lucchetti largo fino 1 kg", "category": "almacen", "price": 2270, "stock": 25, "description": "Arroz largo fino", "image": "/productos/arroz-lucchetti.webp"},
    {"name": "Puré de tomate De la Huerta 530 g", "category": "almacen", "price": 1120, "stock": 30, "description": "Puré de tomate en caja", "image": "/productos/pure-tomate-de-la-huerta.webp"},
    {"name": "Gaseosa Sprite lima-limón 500 ml", "category": "bebidas", "price": 1100, "stock": 30, "description": "Gaseosa sabor lima-limón", "image": "/productos/gaseosa-sprite.webp"},
    {"name": "Jugo Watt's naranja 1 L", "category": "bebidas", "price": 1500, "stock": 20, "description": "Jugo de naranja listo para tomar", "image": "/productos/jugo-watts-naranja.webp"},
    {"name": "Agua saborizada Aquarius pomelo 500 ml", "category": "bebidas", "price": 1000, "stock": 25, "description": "Agua saborizada sabor pomelo", "image": "/productos/agua-aquarius-pomelo.webp"},
    {"name": "Cerveza Andes Origen rubia lata 473 ml", "category": "bebidas", "price": 1700, "stock": 40, "description": "Cerveza rubia en lata", "image": "/productos/cerveza-andes-rubia.webp"},
    {"name": "Fernet Branca 750 ml", "category": "bebidas", "price": 9500, "stock": 10, "description": "Fernet para preparar con cola", "image": "/productos/fernet-branca.webp"},
    {"name": "Vino tinto Muñeco Rebelde malbec 750 ml", "category": "bebidas", "price": 3800, "stock": 12, "description": "Vino tinto malbec", "image": "/productos/vino-muneco-rebelde.webp"},
    {"name": "Alfajor Milka Mousse triple", "category": "golosinas_snacks", "price": 1300, "stock": 40, "description": "Alfajor triple de chocolate con mousse", "image": "/productos/alfajor-milka-mousse.webp"},
    {"name": "Caramelos Pico Dulce", "category": "golosinas_snacks", "price": 1500, "stock": 40, "description": "Caramelos duros, bolsa de 150 g", "image": "/productos/caramelos-pico-dulce.webp"},
    {"name": "Chicles Beldent menta x 6", "category": "golosinas_snacks", "price": 600, "stock": 35, "description": "Chicles sabor menta", "image": "/productos/chicles-beldent-menta.webp"},
    {"name": "Turrón y maní Arcor", "category": "golosinas_snacks", "price": 400, "stock": 40, "description": "Turrón con maní", "image": "/productos/turron-arcor-mani.webp"},
    {"name": "Queso cremoso La Paulina 500 g", "category": "lacteos", "price": 4500, "stock": 10, "description": "Queso cremoso", "image": "/productos/queso-cremoso-la-paulina.webp"},
    {"name": "Manteca Cremigal 200 g", "category": "lacteos", "price": 2300, "stock": 15, "description": "Manteca en pan", "image": "/productos/manteca-cremigal.webp"},
    {"name": "Dulce de leche Vacalin 400 g", "category": "lacteos", "price": 2400, "stock": 20, "description": "Dulce de leche clásico", "image": "/productos/dulce-de-leche-vacalin.webp"},
    {"name": "Crema de leche Cremac", "category": "lacteos", "price": 1600, "stock": 12, "description": "Crema de leche para cocinar", "image": "/productos/crema-cremac.webp"},
    {"name": "Detergente Cif Active Gel limón 500 ml", "category": "limpieza", "price": 1400, "stock": 20, "description": "Detergente para vajilla en gel, aroma limón", "image": "/productos/detergente-cif-limon.webp"},
    {"name": "Jabón en polvo Ala Matic 800 g", "category": "limpieza", "price": 3200, "stock": 12, "description": "Jabón en polvo para lavarropas", "image": "/productos/jabon-polvo-ala.webp"},
    {"name": "Papel higiénico Higienol Texturado 4 x 30 m", "category": "limpieza", "price": 1870, "stock": 20, "description": "Papel higiénico texturado, 4 rollos de 30 m", "image": "/productos/papel-higienol-texturado.webp"},
    {"name": "Esponjas de cocina Piur x 2", "category": "limpieza", "price": 600, "stock": 30, "description": "Esponjas de cocina, 2 unidades", "image": "/productos/esponjas-piur.webp"},
    {"name": "Cigarrillos Melbourne mentolados x 20", "category": "cigarrillos", "price": 2700, "stock": 15, "description": "Atado de cigarrillos mentolados", "image": "/productos/cigarrillos-melbourne.webp"},
    {"name": "Tabaco para armar JBR Original 30 g", "category": "cigarrillos", "price": 3000, "stock": 8, "description": "Tabaco para armar cigarrillos", "image": "/productos/tabaco-jbr-original.webp"},
    {"name": "Leche La Serenísima zero lactosa 1 L", "category": "lacteos", "price": 2960, "stock": 12, "description": "Leche larga vida sin lactosa", "image": "/productos/leche-zero-lactosa.webp"},
    {"name": "Fideos Favorita tallarín 500 g", "category": "almacen", "price": 1170, "stock": 30, "description": "Fideos secos tallarín", "image": "/productos/fideos-favorita-tallarin.webp"},
    {"name": "Fideos Matarazzo spaghetti 500 g", "category": "almacen", "price": 1960, "stock": 30, "description": "Fideos secos spaghetti", "image": "/productos/fideos-matarazzo-spaghetti.webp"},
    {"name": "Harina Favorita 000 1 kg", "category": "almacen", "price": 1260, "stock": 25, "description": "Harina de trigo 000", "image": "/productos/harina-favorita-000.webp"},
    {"name": "Galletitas Traviata x5", "category": "almacen", "price": 3610, "stock": 30, "description": "Galletitas crackers, 5 paquetes", "image": "/productos/galletitas-traviata.webp"},
    {"name": "Sal fina Celusal 500 g", "category": "almacen", "price": 1530, "stock": 25, "description": "Sal fina de mesa", "image": "/productos/sal-celusal-fina.webp"},
    {"name": "Lentejas La Española 400 g", "category": "almacen", "price": 1660, "stock": 20, "description": "Lentejas secas", "image": "/productos/lentejas-la-espanola.webp"},
    {"name": "Mayonesa Hellmann's clásica 475 g", "category": "almacen", "price": 3100, "stock": 15, "description": "Mayonesa clásica", "image": "/productos/mayonesa-hellmanns.webp"},
    {"name": "Café Bonafide Sensaciones intenso (sobres)", "category": "almacen", "price": 4510, "stock": 15, "description": "Café molido intenso en sobres", "image": "/productos/cafe-bonafide-sensaciones.webp"},
    {"name": "Papel higiénico Higienol Fresh 4 x 30 m", "category": "limpieza", "price": 2340, "stock": 20, "description": "Papel higiénico perfumado, 4 rollos de 30 m", "image": "/productos/papel-higienol-fresh.webp"},
    {"name": "Papel higiénico Higienol Plus doble hoja 4 x 30 m", "category": "limpieza", "price": 3450, "stock": 15, "description": "Papel higiénico doble hoja, 4 rollos de 30 m", "image": "/productos/papel-higienol-plus.webp"},
    {"name": "Papel higiénico Higienol Max hoja simple 4 x 50 m", "category": "limpieza", "price": 3500, "stock": 15, "description": "Papel higiénico hoja simple, 4 rollos de 50 m", "image": "/productos/papel-higienol-max.webp"},
    {"name": "Rollo de cocina Sussex clásico x 3", "category": "limpieza", "price": 2660, "stock": 18, "description": "Rollos de papel de cocina, 3 unidades", "image": "/productos/rollo-cocina-sussex.webp"},
    {"name": "Lavandina en gel Ayudín cítrica 700 ml", "category": "limpieza", "price": 3810, "stock": 12, "description": "Lavandina en gel aroma cítrico", "image": "/productos/lavandina-gel-ayudin.webp"},
    {"name": "Quitamanchas Ayudín ropa colores vivos 400 ml", "category": "limpieza", "price": 1940, "stock": 15, "description": "Quitamanchas para ropa de color", "image": "/productos/quitamanchas-ayudin.webp"},
    {"name": "Alcohol etílico San Iginio 96° 500 ml", "category": "limpieza", "price": 2250, "stock": 20, "description": "Alcohol etílico 96°", "image": "/productos/alcohol-san-iginio.webp"},
    {"name": "Esponja Virulana lisa", "category": "limpieza", "price": 950, "stock": 30, "description": "Esponja de cocina lisa", "image": "/productos/esponja-virulana-lisa.webp"},
    {"name": "Trapo de piso gris Media Naranja reforzado", "category": "limpieza", "price": 2130, "stock": 15, "description": "Trapo de piso gris reforzado", "image": "/productos/trapo-piso-media-naranja.webp"},
    {"name": "Bolsas de consorcio 60 x 90 x 10 u.", "category": "limpieza", "price": 1700, "stock": 25, "description": "Bolsas de residuos de 60 x 90 cm, 10 unidades", "image": "/productos/bolsas-consorcio.webp"},
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