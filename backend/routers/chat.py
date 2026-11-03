import logging
import re
import unicodedata

from fastapi import APIRouter, Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import bot_ai
from database import get_db
from models import Product
from schemas import ChatRequest, ChatResponse

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/chat", tags=["chat"])

# --- Datos del kiosko (editar acá) -------------------------------------------

HORARIOS = (  # CONFIRMAR con el equipo
    "Atendemos de lunes a sábado de 8:00 a 22:00 y los domingos de 9:00 a 13:00."
)
MEDIOS_DE_PAGO = (  # CONFIRMAR con el equipo
    "Aceptamos efectivo, tarjeta de débito y crédito, transferencia y Mercado Pago."
)

# Mismos nombres que frontend/src/utils/format.ts (CATEGORY_LABELS).
CATEGORY_LABELS = {
    "bebidas": "Bebidas",
    "golosinas_snacks": "Golosinas y snacks",
    "lacteos": "Lácteos",
    "almacen": "Almacén",
    "limpieza": "Limpieza",
    "cigarrillos": "Cigarrillos",
}

MAX_PRODUCTS_IN_REPLY = 6
MAX_AI_REPLY_LENGTH = 1000

# --- Textos fijos ---------------------------------------------------------------

OUT_OF_SCOPE = (
    "Solo puedo ayudarte con el kiosko: precios, stock, categorías y cómo hacer "
    "un pedido. ¿Buscás algo en particular?"
)
NOT_UNDERSTOOD = (
    "Perdón, no te entendí. Puedo ayudarte con precios, stock, categorías, "
    "horarios, medios de pago y cómo hacer un pedido. ¿Me lo preguntás de otra forma?"
)
GREETING = (
    "¡Hola! Soy KioscoBot. Puedo ayudarte con precios, stock, categorías, "
    "horarios, medios de pago y cómo hacer un pedido. ¿Qué necesitás?"
)
THANKS = "¡De nada! Si necesitás algo más del kiosko, preguntame."
HOW_TO_ORDER = (
    "No puedo hacer pedidos por vos, pero es rápido: entrá a Productos, tocá "
    "\"Agregar al carrito\" en lo que quieras, después andá a Carrito y tocá "
    "\"Finalizar pedido\". El stock se confirma al finalizar."
)
CART_INFO = (
    "Tu carrito lo ves en la sección Carrito: ahí están tus productos, las "
    "cantidades y el total. Yo solo puedo consultar productos, precios y stock."
)
CATEGORIES_TEXT = (
    "Vendemos productos de estas categorías: "
    + ", ".join(CATEGORY_LABELS.values())
    + ". Preguntame por cualquiera y te muestro lo que hay."
)
NOT_FOUND = (
    "No encontré ese producto en el kiosko. Probá con otro nombre o preguntame "
    "por una categoría: " + ", ".join(CATEGORY_LABELS.values()) + "."
)
API_DOWN = (
    "Ahora no puedo consultar los productos. Probá de nuevo en un rato."
)

# --- Palabras clave (ya normalizadas: minúsculas y sin acentos) -----------------

HORARIO_WORDS = {"hora", "horario", "abre", "abren", "abierto", "cierra",
                 "cierran", "cerrado", "atencion", "feriado"}
PAGO_WORDS = {"pago", "pagar", "pagan", "tarjeta", "efectivo", "transferencia",
              "debito", "credito", "mercadopago", "qr", "cuota", "aceptan"}
CART_STATE_WORDS = {"tengo", "llevo", "gastado", "gastar", "total", "mi", "lleno"}
HOW_TO_WORDS = {"comprar", "compro", "compra", "comprame", "pedido", "pedir",
                "finalizar", "carrito"}
STOCK_WORDS = {"stock", "queda", "quedan", "tienen", "hay", "disponible",
               "disponibilidad", "unidad", "tenes"}
PRICE_WORDS = {"precio", "cuanto", "sale", "cuesta", "costo", "vale", "valor"}
CATEGORIES_WORDS = {"categoria", "rubro", "venden", "vende"}
GREETING_WORDS = {"hola", "buenas", "buena", "bueno", "buenos", "buen", "chau",
                  "ayuda", "ayudar", "saludo", "podes"}
THANKS_WORDS = {"gracias", "gracia"}

CATEGORY_KEYWORDS = {
    "bebidas": {"bebida", "gaseosa", "jugo", "refresco"},
    "golosinas_snacks": {"golosina", "snack", "dulce"},
    "lacteos": {"lacteo"},
    "almacen": {"almacen"},
    "limpieza": {"limpieza"},
    "cigarrillos": {"cigarrillo", "cigarro", "pucho"},
}

NAME_STOPWORDS = {"del", "los", "las", "con", "sin", "para", "por", "una"}

# Intentos de ver o cambiar las reglas del bot. El texto llega normalizado
# (minúsculas y sin acentos). Una alternativa por línea.
_INJECTION = re.compile(
    r"""
    (ignor|olvid|saltea).*(instruccion|regla|prompt)        # "olvidá tus reglas"
    | (ignor|olvid)\w*\s+(todo\s+)?lo\s+(anterior|previo)   # "ignorá todo lo anterior"
    | \btus?\s+(instruccion|regla|configuracion|prompt)     # "mostrame tus instrucciones"
    | \bprompt\b                                            # "cuál es tu prompt"
    | \bactua\w*\s+como\b                                   # "actuá como un hacker"
    | \b(a\s+partir\s+de|desde)\s+ahora\s+(sos|seras)\b     # "a partir de ahora sos otro"
    | \bhace\w*\s+de\s+cuenta\b                             # "hacé de cuenta que..."
    | api\s?key | \bclave\b | contrasena                    # claves y contraseñas
    """,
    re.VERBOSE,
)
_GENERIC_QUESTION = re.compile(r"\bque (tienen|hay|venden|vendes|ofrecen)\b")


# --- Utilidades de texto ----------------------------------------------------------

def _normalize(text: str) -> str:
    """Minúsculas y sin acentos: '¿Cuánto?' -> '¿cuanto?'."""
    text = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def _forms(word: str) -> set[str]:
    """La palabra y sus posibles singulares: 'alfajores' -> alfajores, alfajore, alfajor."""
    forms = {word}
    if word.endswith("s") and len(word) - 1 >= 3:
        forms.add(word[:-1])
    if word.endswith("es") and len(word) - 2 >= 3:
        forms.add(word[:-2])
    return forms


def _word_forms(text: str) -> set[str]:
    forms: set[str] = set()
    for token in re.findall(r"[a-z0-9]+", text):
        forms |= _forms(token)
    return forms


def _name_tokens(name: str) -> list[str]:
    tokens = re.findall(r"[a-z0-9]+", _normalize(name))
    return [
        t for t in tokens
        if len(t) >= 3 and not any(c.isdigit() for c in t) and t not in NAME_STOPWORDS
    ]


def format_price(price: float) -> str:
    """1200 -> '$ 1.200'; 1250.5 -> '$ 1.250,50' (como formatPrice del frontend)."""
    text = f"{price:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if text.endswith(",00"):
        text = text[:-3]
    return f"$ {text}"


def _stock_label(stock: int) -> str:
    if stock <= 0:
        return "sin stock"
    return "1 unidad" if stock == 1 else f"{stock} unidades"


# --- Respuestas con datos de la base ------------------------------------------------

def _search_products(words: set[str], products: list[Product]) -> list[Product]:
    scored = []
    for product in products:
        score = sum(1 for t in _name_tokens(product.name) if _forms(t) & words)
        if score:
            scored.append((score, product))
    if not scored:
        return []
    best = max(score for score, _ in scored)
    return [p for score, p in scored if score == best]


def _list_lines(items: list[Product]) -> str:
    lines = [
        f"- {p.name}: {format_price(p.price)} ({_stock_label(p.stock)})"
        for p in items[:MAX_PRODUCTS_IN_REPLY]
    ]
    extra = len(items) - MAX_PRODUCTS_IN_REPLY
    if extra > 0:
        lines.append(f"… y {extra} más.")
    return "\n".join(lines)


def _product_reply(hits: list[Product], words: set[str]) -> str:
    if len(hits) == 1:
        p = hits[0]
        if p.stock > 0:
            text = f"{p.name} sale {format_price(p.price)} y hay {_stock_label(p.stock)}."
        else:
            text = f"{p.name} sale {format_price(p.price)}, pero por ahora está sin stock."
    else:
        text = "Encontré estos productos:\n" + _list_lines(hits)
    if words & STOCK_WORDS:
        text += " El stock puede cambiar hasta que confirmes el pedido."
    return text


def _category_reply(category: str, products: list[Product]) -> str:
    label = CATEGORY_LABELS[category]
    items = [p for p in products if p.category == category]
    if not items:
        return f"Por ahora no tengo productos en {label}."
    return f"En {label} tengo:\n" + _list_lines(items)


def _find_category(words: set[str]) -> str | None:
    for category, keywords in CATEGORY_KEYWORDS.items():
        if words & keywords:
            return category
    return None


def _catalog_reply(text: str, words: set[str], db: Session) -> str | None:
    """Respuestas que necesitan la base. Devuelve None si el mensaje no es de eso."""
    products = db.query(Product).order_by(Product.id).all()

    hits = _search_products(words, products)
    if hits:
        return _product_reply(hits, words)

    category = _find_category(words)
    if category:
        return _category_reply(category, products)

    if words & CATEGORIES_WORDS or _GENERIC_QUESTION.search(text):
        return CATEGORIES_TEXT

    if words & (STOCK_WORDS | PRICE_WORDS):
        return NOT_FOUND
    return None


# --- Lógica principal ---------------------------------------------------------------

def build_reply(message: str, db: Session) -> str:
    """Arma la respuesta del bot. Solo lee datos: nunca crea pedidos ni toca stock."""
    text = _normalize(message)
    words = _word_forms(text)

    if _INJECTION.search(text):
        return OUT_OF_SCOPE
    if words & HORARIO_WORDS:
        return HORARIOS
    if words & PAGO_WORDS:
        return MEDIOS_DE_PAGO
    if "carrito" in words and words & CART_STATE_WORDS:
        return CART_INFO
    if words & HOW_TO_WORDS:
        return HOW_TO_ORDER

    try:
        reply = _catalog_reply(text, words, db)
    except SQLAlchemyError as exc:
        logger.error("KioscoBot no pudo consultar la base: %s", exc)
        return API_DOWN
    if reply:
        return reply

    if words & THANKS_WORDS:
        return THANKS
    if words & GREETING_WORDS:
        return GREETING
    return NOT_UNDERSTOOD


def _catalog_for_ai(products: list[Product]) -> list[str]:
    return [
        f"{p.name} | {CATEGORY_LABELS.get(p.category, p.category)} | "
        f"{format_price(p.price)} | {_stock_label(p.stock)}"
        for p in products
    ]


def ai_reply(message: str, db: Session) -> str | None:
    """Respuesta de la IA con los datos de la base, o None para usar las reglas."""
    if not bot_ai.is_enabled():
        return None
    try:
        products = db.query(Product).order_by(Product.id).all()
    except SQLAlchemyError as exc:
        logger.error("KioscoBot no pudo consultar la base: %s", type(exc).__name__)
        return None
    reply = bot_ai.ai_reply(message, _catalog_for_ai(products), HORARIOS, MEDIOS_DE_PAGO)
    if not reply:
        return None
    reply = reply.strip()
    if len(reply) > MAX_AI_REPLY_LENGTH:
        reply = reply[: MAX_AI_REPLY_LENGTH - 1].rstrip() + "…"
    return reply


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    # Los intentos de cambiar las reglas nunca llegan a la IA: responde la regla.
    if _INJECTION.search(_normalize(payload.message)):
        return ChatResponse(reply=OUT_OF_SCOPE)
    # Primero la IA (si hay BOT_API_KEY); si no responde, las reglas de siempre.
    reply = ai_reply(payload.message, db) or build_reply(payload.message, db)
    return ChatResponse(reply=reply)