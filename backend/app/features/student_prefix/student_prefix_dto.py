from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from app.common.base_dto import BaseResponse


class PrefixCreate(BaseModel):
    prefix: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$", description="6 haneli rakam")
    entry_year: int = Field(ge=2000, le=2100)
    label: str = Field(min_length=1, max_length=50, description="ör: '2. Sınıf'")


class PrefixUpdate(BaseModel):
    entry_year: Optional[int] = Field(default=None, ge=2000, le=2100)
    label: Optional[str] = Field(default=None, min_length=1, max_length=50)


class PrefixResponse(BaseResponse):
    prefix: str
    entry_year: int
    label: str
    created_by: Optional[UUID] = None

    model_config = {"from_attributes": True}
