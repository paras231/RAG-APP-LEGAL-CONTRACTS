"""FastAPI dependency that resolves the authenticated user from a bearer JWT."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decode_access_token
from app.db.models import User
from app.db.session import get_session

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str = Depends(_oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    user_id = decode_access_token(token)
    if user_id is None:
        raise _CREDENTIALS_EXCEPTION

    user = await session.get(User, user_id)
    if user is None:
        raise _CREDENTIALS_EXCEPTION
    return user
