import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from datetime import datetime

from main import app
from database import Base, get_db
from models import AuthSession, User
from security import SESSION_DURATION, hash_password, hash_token, new_session_token

CLAVE_DE_PRUEBA = "clave-de-prueba"
# Scrypt es lento a propósito: el hash se calcula una vez y se reutiliza.
_HASH_DE_PRUEBA = hash_password(CLAVE_DE_PRUEBA)


def crear_usuario(db, email="cliente@test.com", role="customer", **campos):
    usuario = User(
        **{"first_name": "Ana", "last_name": "Pérez", **campos},
        email=email,
        role=role,
        password_hash=_HASH_DE_PRUEBA,
    )
    db.add(usuario)
    db.commit()
    return usuario


def headers_de(db, usuario):
    token = new_session_token()
    db.add(
        AuthSession(
            user_id=usuario.id,
            token_hash=hash_token(token),
            expires_at=datetime.now() + SESSION_DURATION,
        )
    )
    db.commit()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def no_bot_api_key(monkeypatch):
    # Ningún test llama a la API real de la IA, aunque haya un .env con clave.
    monkeypatch.setenv("BOT_API_KEY", "")


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def cliente(db_session):
    return crear_usuario(db_session)


@pytest.fixture()
def customer_headers(db_session, cliente):
    return headers_de(db_session, cliente)


@pytest.fixture()
def admin(db_session):
    return crear_usuario(db_session, email="admin@test.com", role="admin")


@pytest.fixture()
def admin_headers(db_session, admin):
    return headers_de(db_session, admin)