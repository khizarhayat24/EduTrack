import hashlib
import hmac
import secrets
import datetime
from typing import Optional

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session as DBSession

from db import get_db
import models

# Pure-stdlib password hashing (PBKDF2). No bcrypt/passlib dependency, so this
# installs cleanly on any machine without needing a compiler toolchain.
PBKDF2_ITERATIONS = 260_000
SESSION_TTL_DAYS = 14


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS
    )
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest_hex = stored.split("$")
    except ValueError:
        return False
    new_digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS
    )
    return hmac.compare_digest(new_digest.hex(), digest_hex)


def create_session(db: DBSession, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.datetime.utcnow() + datetime.timedelta(days=SESSION_TTL_DAYS)
    db.add(models.Session(token=token, user_id=user_id, expires_at=expires))
    db.commit()
    return token


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: DBSession = Depends(get_db),
) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = authorization[len("Bearer "):].strip()
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if not session or session.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired or invalid.")
    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    db: DBSession = Depends(get_db),
) -> Optional[models.User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return get_current_user(authorization, db)
    except HTTPException:
        return None
