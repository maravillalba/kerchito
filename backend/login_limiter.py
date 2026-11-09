"""Límite simple de intentos de login, en memoria.

Cuenta por correo + IP: frena a quien prueba contraseñas sin dejarle a un tercero la
posibilidad de bloquear la cuenta de otra persona desde su propia conexión. Se reinicia
con el servidor y no se comparte entre procesos: alcanza para un solo uvicorn.
"""

import math
import threading
import time

MAX_FAILED_ATTEMPTS = 5
WINDOW_SECONDS = 15 * 60

_failures: dict[tuple[str, str], list[float]] = {}
# FastAPI corre los endpoints sincrónicos en varios hilos.
_lock = threading.Lock()


def _recent(key: tuple[str, str], now: float) -> list[float]:
    return [moment for moment in _failures.get(key, []) if now - moment < WINDOW_SECONDS]


def retry_after(ip: str, email: str) -> int | None:
    """Segundos que faltan si está bloqueado; None si puede intentar."""
    now = time.monotonic()
    with _lock:
        recent = _recent((ip, email), now)
    if len(recent) < MAX_FAILED_ATTEMPTS:
        return None
    # Se libera cuando el fallo más viejo de los que cuentan sale de la ventana.
    return max(1, math.ceil(WINDOW_SECONDS - (now - recent[0])))


def record_failure(ip: str, email: str) -> None:
    now = time.monotonic()
    key = (ip, email)
    with _lock:
        _failures[key] = [*_recent(key, now), now]
        # Sin esto, probar correos inventados haría crecer la memoria sin fin.
        for other in [k for k in _failures if not _recent(k, now)]:
            del _failures[other]


def clear(ip: str, email: str) -> None:
    with _lock:
        _failures.pop((ip, email), None)


def reset() -> None:
    with _lock:
        _failures.clear()
