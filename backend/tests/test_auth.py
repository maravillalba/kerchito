from datetime import datetime, timedelta

import pytest
from sqlalchemy import text

from conftest import CLAVE_DE_PRUEBA, headers_de
from models import AuthSession, User
from security import hash_password, hash_token, verify_password

REGISTRO = {
    "first_name": "Lucía",
    "last_name": "Gómez",
    "email": "lucia@test.com",
    "phone": "11 5555-5555",
    "password": "una-clave-larga",
}


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


# --- Registro ---------------------------------------------------------------------


def test_registro_crea_cliente_y_devuelve_sesion(client):
    respuesta = client.post("/api/auth/register", json=REGISTRO)
    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["token"]
    assert cuerpo["user"]["email"] == "lucia@test.com"
    assert cuerpo["user"]["role"] == "customer"
    # La sesión devuelta funciona.
    assert client.get("/api/auth/me", headers=bearer(cuerpo["token"])).status_code == 200


def test_registro_no_devuelve_ni_guarda_la_contrasena(client, db_session):
    respuesta = client.post("/api/auth/register", json=REGISTRO)
    assert REGISTRO["password"] not in respuesta.text
    assert "password" not in respuesta.json()["user"]

    usuario = db_session.query(User).one()
    assert REGISTRO["password"] not in usuario.password_hash
    assert usuario.password_hash.startswith("scrypt$")
    assert verify_password(REGISTRO["password"], usuario.password_hash)


def test_registro_no_guarda_el_token_en_claro(client, db_session):
    token = client.post("/api/auth/register", json=REGISTRO).json()["token"]
    sesion = db_session.query(AuthSession).one()
    assert sesion.token_hash != token
    assert sesion.token_hash == hash_token(token)


def test_registro_guarda_el_correo_en_minusculas(client, db_session):
    client.post("/api/auth/register", json={**REGISTRO, "email": "  LuCia@Test.COM "})
    assert db_session.query(User).one().email == "lucia@test.com"


def test_registro_ignora_el_rol_que_manda_el_front(client):
    respuesta = client.post("/api/auth/register", json={**REGISTRO, "role": "admin"})
    assert respuesta.json()["user"]["role"] == "customer"


def test_registro_correo_repetido_devuelve_409(client):
    client.post("/api/auth/register", json=REGISTRO)
    respuesta = client.post("/api/auth/register", json={**REGISTRO, "email": "LUCIA@test.com"})
    assert respuesta.status_code == 409
    assert respuesta.json()["detail"] == "Ya existe una cuenta con ese correo"


def test_registro_telefono_es_opcional(client):
    sin_telefono = {k: v for k, v in REGISTRO.items() if k != "phone"}
    assert client.post("/api/auth/register", json=sin_telefono).json()["user"]["phone"] is None


def test_registro_telefono_vacio_se_guarda_como_null(client):
    respuesta = client.post("/api/auth/register", json={**REGISTRO, "phone": "   "})
    assert respuesta.json()["user"]["phone"] is None


@pytest.mark.parametrize(
    "cambio",
    [
        {"password": "corta12"},
        {"password": "x" * 129},
        {"email": "sin-arroba"},
        {"email": "a@b"},
        {"email": "con espacio@test.com"},
        {"first_name": "   "},
        {"last_name": ""},
    ],
    ids=["clave-corta", "clave-larga", "sin-arroba", "sin-dominio", "espacio", "nombre", "apellido"],
)
def test_registro_con_datos_invalidos_devuelve_422(client, db_session, cambio):
    assert client.post("/api/auth/register", json={**REGISTRO, **cambio}).status_code == 422
    assert db_session.query(User).count() == 0


def test_registro_acepta_clave_de_8_caracteres(client):
    assert client.post("/api/auth/register", json={**REGISTRO, "password": "12345678"}).status_code == 201


# --- Hash -------------------------------------------------------------------------


def test_el_hash_usa_un_salt_distinto_cada_vez():
    assert hash_password("misma-clave") != hash_password("misma-clave")


def test_verify_password_rechaza_clave_incorrecta_y_hash_roto():
    guardado = hash_password("correcta-123")
    assert verify_password("correcta-123", guardado)
    assert not verify_password("incorrecta-123", guardado)
    assert not verify_password("correcta-123", "no-es-un-hash")
    assert not verify_password("correcta-123", "scrypt$a$b$c$d$e")


# --- Login ------------------------------------------------------------------------


def test_login_correcto_devuelve_sesion(client, db_session, cliente):
    respuesta = client.post(
        "/api/auth/login", json={"email": cliente.email, "password": CLAVE_DE_PRUEBA}
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["user"]["id"] == cliente.id
    assert client.get("/api/auth/me", headers=bearer(respuesta.json()["token"])).status_code == 200


def test_login_no_distingue_mayusculas_en_el_correo(client, cliente):
    respuesta = client.post(
        "/api/auth/login", json={"email": " CLIENTE@test.com ", "password": CLAVE_DE_PRUEBA}
    )
    assert respuesta.status_code == 200


def test_login_no_revela_si_el_correo_existe(client, cliente):
    clave_mal = client.post(
        "/api/auth/login", json={"email": cliente.email, "password": "otra-clave-mala"}
    )
    correo_mal = client.post(
        "/api/auth/login", json={"email": "nadie@test.com", "password": "otra-clave-mala"}
    )
    assert clave_mal.status_code == correo_mal.status_code == 401
    assert clave_mal.json() == correo_mal.json() == {"detail": "Correo o contraseña incorrectos"}


def test_login_borra_las_sesiones_vencidas_del_usuario(client, db_session, cliente):
    db_session.add(
        AuthSession(
            user_id=cliente.id,
            token_hash="vencida",
            expires_at=datetime.now() - timedelta(days=1),
        )
    )
    db_session.commit()
    client.post("/api/auth/login", json={"email": cliente.email, "password": CLAVE_DE_PRUEBA})
    assert db_session.query(AuthSession).filter_by(token_hash="vencida").count() == 0


# --- Sesión -----------------------------------------------------------------------


def test_me_devuelve_el_usuario_actual_sin_datos_sensibles(client, customer_headers, cliente):
    respuesta = client.get("/api/auth/me", headers=customer_headers)
    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == cliente.email
    assert "password_hash" not in respuesta.json()


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer inventado"}, {"Authorization": "Basic abc"}],
    ids=["sin-header", "token-invalido", "otro-esquema"],
)
def test_me_sin_sesion_valida_devuelve_401(client, cliente, headers):
    respuesta = client.get("/api/auth/me", headers=headers)
    assert respuesta.status_code == 401
    assert respuesta.headers["www-authenticate"] == "Bearer"


def test_sesion_vencida_devuelve_401(client, db_session, cliente, customer_headers):
    db_session.execute(text("UPDATE sessions SET expires_at = '2000-01-01 00:00:00'"))
    db_session.commit()
    db_session.expire_all()
    assert client.get("/api/auth/me", headers=customer_headers).status_code == 401


def test_la_sesion_dura_siete_dias(client):
    cuerpo = client.post("/api/auth/register", json=REGISTRO).json()
    vence = datetime.fromisoformat(cuerpo["expires_at"])
    assert timedelta(days=6, hours=23) < vence - datetime.now() <= timedelta(days=7)


def test_logout_invalida_solo_la_sesion_actual(client, db_session, cliente):
    primera = headers_de(db_session, cliente)
    segunda = headers_de(db_session, cliente)
    assert client.post("/api/auth/logout", headers=primera).status_code == 204
    assert client.get("/api/auth/me", headers=primera).status_code == 401
    assert client.get("/api/auth/me", headers=segunda).status_code == 200


def test_logout_sin_sesion_devuelve_401(client):
    assert client.post("/api/auth/logout").status_code == 401
