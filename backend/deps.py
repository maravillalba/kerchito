"""Dependencias de autenticación reutilizables por los routers."""

from datetime import datetime

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import AuthSession, User
from security import hash_token

_bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Iniciá sesión para continuar",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _forbidden() -> HTTPException:
    return HTTPException(status_code=403, detail="No tenés permiso para hacer esto")


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AuthSession:
    if credentials is None:
        raise _unauthorized()
    session = (
        db.query(AuthSession)
        .filter(AuthSession.token_hash == hash_token(credentials.credentials))
        .first()
    )
    if session is None or session.expires_at <= datetime.now():
        raise _unauthorized()
    return session


def get_current_user(session: AuthSession = Depends(get_current_session)) -> User:
    return session.user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise _forbidden()
    return user


def require_customer(user: User = Depends(get_current_user)) -> User:
    if user.role != "customer":
        raise _forbidden()
    return user
