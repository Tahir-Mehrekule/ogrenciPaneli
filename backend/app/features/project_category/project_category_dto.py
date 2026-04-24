"""
ProjectCategory DTO (Data Transfer Object) modülü.
"""

from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field

from app.common.base_dto import BaseResponse


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryResponse(BaseResponse):
    name: str
    course_id: UUID
    created_by: Optional[UUID] = None
    color: Optional[str] = None

    model_config = {"from_attributes": True}
