import json
import logging

import httpx
import pytest

import bot_ai

CLAVE_FALSA = "clave-falsa-solo-para-tests"
MENSAJE = "mensaje-privado-del-cliente"
CATALOGO = ["Coca-Cola 500ml | Bebidas | $ 1.200 | 25 unidades"]


@pytest.fixture(autouse=True)
def sin_red(monkeypatch):
    # Red de seguridad: si algún test llega a httpx.post sin reemplazarlo, falla.
    # pytest.fail no es una Exception, así que el except de ai_reply no la tapa.
    def prohibido(*args, **kwargs):
        pytest.fail("bot_ai intentó salir a la red")

    monkeypatch.setattr(bot_ai.httpx, "post", prohibido)


@pytest.fixture()
def con_clave(monkeypatch):
    monkeypatch.setenv("BOT_API_KEY", CLAVE_FALSA)


def usar_transporte(monkeypatch, handler):
    """Reemplaza httpx.post por un cliente con MockTransport. Devuelve los pedidos enviados."""
    pedidos = []

    def registrar(request):
        pedidos.append(request)
        return handler(request)

    def post_falso(url, **kwargs):
        with httpx.Client(transport=httpx.MockTransport(registrar)) as cliente:
            return cliente.post(url, **kwargs)

    monkeypatch.setattr(bot_ai.httpx, "post", post_falso)
    return pedidos


def llamar():
    return bot_ai.ai_reply(MENSAJE, CATALOGO, "horarios de prueba", "medios de prueba")


def respuesta_ok(texto, stop_reason="end_turn"):
    return httpx.Response(
        200, json={"content": [{"type": "text", "text": texto}], "stop_reason": stop_reason}
    )


# --- Sin clave ------------------------------------------------------------------


def test_sin_clave_no_esta_habilitada():
    assert bot_ai.is_enabled() is False


def test_clave_con_solo_espacios_no_cuenta(monkeypatch):
    monkeypatch.setenv("BOT_API_KEY", "   ")
    assert bot_ai.is_enabled() is False


def test_sin_clave_devuelve_none_sin_salir_a_la_red():
    # Si llamara a httpx.post, la fixture sin_red haría fallar el test.
    assert llamar() is None


# --- Con clave ----------------------------------------------------------------------


def test_con_clave_esta_habilitada(con_clave):
    assert bot_ai.is_enabled() is True


def test_respuesta_correcta_devuelve_el_texto(con_clave, monkeypatch):
    usar_transporte(monkeypatch, lambda request: respuesta_ok("  Hola desde la IA  "))
    assert llamar() == "Hola desde la IA"


def test_arma_bien_el_pedido_al_proveedor(con_clave, monkeypatch):
    pedidos = usar_transporte(monkeypatch, lambda request: respuesta_ok("ok"))
    llamar()

    assert len(pedidos) == 1
    pedido = pedidos[0]
    assert str(pedido.url) == bot_ai.API_URL
    assert pedido.headers["x-api-key"] == CLAVE_FALSA
    cuerpo = json.loads(pedido.content)
    assert cuerpo["model"] == bot_ai.DEFAULT_MODEL
    assert cuerpo["max_tokens"] == bot_ai.MAX_TOKENS
    # El mensaje del cliente va solo en el rol user, separado de las reglas.
    assert cuerpo["messages"] == [{"role": "user", "content": MENSAJE}]
    assert MENSAJE not in cuerpo["system"]
    assert CATALOGO[0] in cuerpo["system"]
    assert "horarios de prueba" in cuerpo["system"]


def test_bot_model_cambia_el_modelo(con_clave, monkeypatch):
    monkeypatch.setenv("BOT_MODEL", "modelo-de-prueba")
    pedidos = usar_transporte(monkeypatch, lambda request: respuesta_ok("ok"))
    llamar()
    assert json.loads(pedidos[0].content)["model"] == "modelo-de-prueba"


def test_catalogo_vacio_lo_aclara_en_el_prompt():
    prompt = bot_ai.build_system_prompt([], "h", "m")
    assert "(no hay productos cargados)" in prompt


# --- Fallas: siempre devuelve None, nunca levanta excepciones ---------------------


def _lanza(excepcion):
    def handler(request):
        raise excepcion

    return handler


@pytest.mark.parametrize(
    "handler",
    [
        pytest.param(lambda r: httpx.Response(401, json={"error": {"type": "authentication_error"}}), id="401"),
        pytest.param(lambda r: httpx.Response(500, text="no es json"), id="500-sin-json"),
        pytest.param(lambda r: respuesta_ok("cortado", stop_reason="max_tokens"), id="max_tokens"),
        pytest.param(lambda r: respuesta_ok("   "), id="texto-vacio"),
        pytest.param(lambda r: httpx.Response(200, json={"content": []}), id="sin-bloques"),
        pytest.param(lambda r: httpx.Response(200, text="no es json"), id="200-sin-json"),
        pytest.param(_lanza(httpx.ReadTimeout("timeout simulado")), id="timeout"),
        pytest.param(_lanza(httpx.ConnectError("sin red simulada")), id="sin-conexion"),
    ],
)
def test_si_algo_falla_devuelve_none(con_clave, monkeypatch, handler):
    usar_transporte(monkeypatch, handler)
    assert llamar() is None


def test_error_inesperado_devuelve_none(con_clave, monkeypatch):
    def post_roto(*args, **kwargs):
        raise RuntimeError("error inesperado simulado")

    monkeypatch.setattr(bot_ai.httpx, "post", post_roto)
    assert llamar() is None


# --- Logs ------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "handler",
    [
        pytest.param(lambda r: httpx.Response(401, json={"error": {"type": "authentication_error"}}), id="401"),
        pytest.param(lambda r: respuesta_ok("x", stop_reason="max_tokens"), id="max_tokens"),
        pytest.param(_lanza(httpx.ReadTimeout(f"timeout {CLAVE_FALSA} {MENSAJE}")), id="timeout"),
        pytest.param(_lanza(httpx.ConnectError(f"error {CLAVE_FALSA} {MENSAJE}")), id="sin-conexion"),
    ],
)
def test_logs_no_muestran_la_clave_ni_el_mensaje(con_clave, monkeypatch, caplog, handler):
    usar_transporte(monkeypatch, handler)
    caplog.set_level(logging.DEBUG)

    assert llamar() is None
    assert caplog.records  # se registró la falla...
    assert CLAVE_FALSA not in caplog.text  # ...sin la clave
    assert MENSAJE not in caplog.text  # ...ni el mensaje
