from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.db.models import Chat, User
from app.db.session import get_session
from app.schemas.chat import ChatDetail, ChatRenameRequest, ChatSummary

router = APIRouter(prefix="/chats", tags=["chats"])


async def _get_owned_chat(chat_id, session: AsyncSession, user: User, load_messages: bool = False) -> Chat:
    stmt = select(Chat).where(Chat.id == chat_id)
    if load_messages:
        stmt = stmt.options(selectinload(Chat.messages))
    result = await session.execute(stmt)
    chat_obj = result.scalar_one_or_none()
    if chat_obj is None or chat_obj.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat_obj


@router.get("", response_model=list[ChatSummary])
async def list_chats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Chat).where(Chat.user_id == current_user.id).order_by(Chat.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{chat_id}", response_model=ChatDetail)
async def get_chat(
    chat_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await _get_owned_chat(chat_id, session, current_user, load_messages=True)


@router.patch("/{chat_id}", response_model=ChatSummary)
async def rename_chat(
    chat_id: str,
    request: ChatRenameRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    chat_obj = await _get_owned_chat(chat_id, session, current_user)
    chat_obj.title = request.title
    await session.commit()
    await session.refresh(chat_obj)
    return chat_obj


@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    chat_obj = await _get_owned_chat(chat_id, session, current_user)
    await session.delete(chat_obj)
    await session.commit()
