import hashlib
import secrets
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Session

_SESSION_TTL_DAYS = 30
_PBKDF2_ITERATIONS = 600000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), _PBKDF2_ITERATIONS)
    return f"pbkdf2:sha256:{_PBKDF2_ITERATIONS}:{salt}:{base64.b64encode(dk).decode('ascii')}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        parts = password_hash.split(':')
        if parts[0] != 'pbkdf2':
            return False
        _, algo, iterations, salt, hash_b64 = parts
        dk = hashlib.pbkdf2_hmac(algo, password.encode('utf-8'), salt.encode('utf-8'), int(iterations))
        expected = base64.b64decode(hash_b64)
        return secrets.compare_digest(dk, expected)
    except (ValueError, IndexError, TypeError):
        return False


def generate_token() -> str:
    return f"dm_{secrets.token_urlsafe(48)}"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_session(db: AsyncSession, user_id: str) -> Session:
    token = generate_token()
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=_SESSION_TTL_DAYS)
    session = Session(user_id=user_id, token=token_hash, expires_at=expires_at)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    # Keep session.token as the plaintext for the return value (overwrite in-memory)
    session.token = token
    return session


async def get_session_by_token(db: AsyncSession, token: str) -> Optional[Session]:
    token_hash = _hash_token(token)
    result = await db.execute(
        select(Session).where(Session.token == token_hash, Session.expires_at > datetime.now(timezone.utc))
    )
    session = result.scalar_one_or_none()
    return session


async def delete_session(db: AsyncSession, token: str) -> None:
    token_hash = _hash_token(token)
    result = await db.execute(select(Session).where(Session.token == token_hash))
    session = result.scalar_one_or_none()
    if session:
        await db.delete(session)
        await db.commit()
