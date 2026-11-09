"""Contraseñas y tokens de sesión, solo con la librería estándar."""

import hashlib
import hmac
import secrets
from datetime import timedelta

SESSION_DURATION = timedelta(days=7)

# Costo de scrypt. Los parámetros se guardan en cada hash, así que se pueden subir
# más adelante sin invalidar las contraseñas existentes.
_SCRYPT_N = 2**15
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 32
_SALT_BYTES = 16
# scrypt usa 128 * N * r bytes (32 MiB con estos valores) y el límite por defecto
# de hashlib es justo: hay que ampliarlo.
_SCRYPT_MAXMEM = 64 * 1024 * 1024


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int, dklen: int) -> bytes:
    return hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=n, r=r, p=p, dklen=dklen, maxmem=_SCRYPT_MAXMEM
    )


def hash_password(password: str) -> str:
    """Devuelve 'scrypt$n$r$p$salt$hash', con un salt aleatorio distinto cada vez."""
    salt = secrets.token_bytes(_SALT_BYTES)
    derived = _scrypt(password, salt, _SCRYPT_N, _SCRYPT_R, _SCRYPT_P, _SCRYPT_DKLEN)
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, expected = stored.split("$")
        if scheme != "scrypt":
            return False
        expected_bytes = bytes.fromhex(expected)
        derived = _scrypt(
            password, bytes.fromhex(salt), int(n), int(r), int(p), len(expected_bytes)
        )
    except ValueError:
        return False
    return hmac.compare_digest(derived, expected_bytes)


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    # El token ya es aleatorio y largo: alcanza con SHA-256, sin salt ni scrypt.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
