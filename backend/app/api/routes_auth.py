from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.db.session import get_session
from app.schemas.auth import SignupRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if user is None or user.hashed_password is None or not verify_password(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/guest", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def continue_as_guest(session: AsyncSession = Depends(get_session)):
    user = User(email=None, hashed_password=None, full_name="Guest", is_guest=True)
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/upgrade", response_model=TokenResponse)
async def upgrade_guest(
    request: SignupRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not current_user.is_guest:
        raise HTTPException(status_code=400, detail="Account is already registered")

    existing = await session.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    current_user.email = request.email
    current_user.hashed_password = hash_password(request.password)
    current_user.full_name = request.full_name
    current_user.is_guest = False
    await session.commit()

    token = create_access_token(subject=str(current_user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
