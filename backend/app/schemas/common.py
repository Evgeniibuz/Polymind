"""Shared Pydantic schemas."""

from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    """Base schema enabling ORM mode."""
    model_config = ConfigDict(from_attributes=True)


class IDOnlyResponse(BaseModel):
    id: UUID


class TimestampedModel(ORMModel):
    id: UUID
    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
    has_more: bool
