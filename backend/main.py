import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Lee backend/.env antes de importar los módulos que usan variables de entorno
# (database.py lee DATABASE_URL al importarse). Las variables definidas en la
# terminal tienen prioridad sobre las del archivo.
load_dotenv(Path(__file__).with_name(".env"), override=False)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from routers import auth, chat, orders, products
from seed import seed, seed_admin

logger = logging.getLogger("uvicorn.error")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al arrancar: crea las tablas, carga el seed si products está vacía y crea
    # el admin desde el .env.
    seed()
    seed_admin()
    yield


app = FastAPI(title="Kiosco El Rápido API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(chat.router)

@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    # Errores inesperados de la base: se loguean y el cliente recibe un 500
    # con el mismo formato {"detail": ...} que el resto de la API.
    logger.error("Error de base de datos en %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health")
def health():
    return {"status": "ok"}