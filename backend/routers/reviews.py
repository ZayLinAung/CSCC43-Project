from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from db import get_conn
from routers.auth import get_current_user

router = APIRouter(
    prefix="/{stocklist_id}/reviews",
    tags=["users-detail"]
)