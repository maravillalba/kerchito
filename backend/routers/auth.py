import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import login_limiter
from accounts import user_out
from database import get_db
from deps import get_current_session, get_current_user
from models import AuthSession, User
from schemas import AuthOut, LoginIn, RegisterIn, UserOut
from security import (
    SESSION_DURATION,
    hash_password,
    hash_token,
    new_session_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL_TAKEN = "Ya existe una cuenta con ese correo"
_BAD_CREDENTIALS = "Correo o contraseña incorrectos"


def _open_session(db: Session, user: User) -> AuthOut:
    """Agrega la sesión a la transacción en curso. El token se muestra solo acá."""
    token = new_session_token()
    expires_at = datetime.now() + SESSION_DURATION
    db.add(AuthSession(user=user, token_hash=hash_token(token), expires_at=expires_at))
    db.commit()
    return AuthOut(token=token, expires_at=expires_at, user=user_out(db, user))


@router.post("/register", response_model=AuthOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first() is not None:
        raise HTTPException(status_code=409, detail=_EMAIL_TAKEN)

    # role queda en "customer": no se lee del pedido, nadie se registra como admin.
    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        return _open_session(db, user)
    except IntegrityError:
        # Dos registros simultáneos con el mismo correo: lo frena el UNIQUE.
        db.rollback()
        raise HTTPException(status_code=409, detail=_EMAIL_TAKEN) from None


@router.post("/login", response_model=AuthOut)
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "desconocida"
    wait = login_limiter.retry_after(ip, data.email)
    if wait is not None:
        minutes = math.ceil(wait / 60)
        raise HTTPException(
            status_code=429,
            detail=(
                "Demasiados intentos. Probá de nuevo en "
                f"{minutes} {'minuto' if minutes == 1 else 'minutos'}."
            ),
            headers={"Retry-After": str(wait)},
        )

    user = db.query(User).filter(User.email == data.email).first()
    if user is None:
        # Se calcula un hash igual para que el tiempo de respuesta no revele
        # si el correo existe.
        hash_password(data.password)
        login_limiter.record_failure(ip, data.email)
        raise HTTPException(status_code=401, detail=_BAD_CREDENTIALS)
    if not verify_password(data.password, user.password_hash):
        login_limiter.record_failure(ip, data.email)
        raise HTTPException(status_code=401, detail=_BAD_CREDENTIALS)

    login_limiter.clear(ip, data.email)
    db.execute(
        delete(AuthSession).where(
            AuthSession.user_id == user.id, AuthSession.expires_at <= datetime.now()
        )
    )
    return _open_session(db, user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_out(db, user)


@router.post("/logout", status_code=204)
def logout(session: AuthSession = Depends(get_current_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    return Response(status_code=204)
