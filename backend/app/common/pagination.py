"""
Sayfalama, sıralama ve filtreleme helper modülü.

Feature'lar için karmaşık sorgu ihtiyaçlarını karşılar.
base_repo.py'daki basit get_all'dan daha gelişmiş filtreleme imkanı sunar.
"""

import math

from sqlalchemy import desc, asc, or_
from sqlalchemy.orm import Session, Query

from app.common.base_dto import PaginatedResponse, FilterParams


def apply_sorting(query: Query, model, sort_by: str, order: str) -> Query:
    """
    Sorguya dinamik sıralama uygular.

    Args:
        query: SQLAlchemy sorgusu
        model: SQLAlchemy model sınıfı
        sort_by: Sıralama alanı (örn: "created_at", "name")
        order: Sıralama yönü ("asc" veya "desc")

    Returns:
        Sıralanmış sorgu
    """
    sort_column = getattr(model, sort_by, None)
    if sort_column is None:
        # Geçersiz alan adı verilirse varsayılan olarak created_at kullan
        sort_column = getattr(model, "created_at", None)

    if sort_column is not None:
        query = query.order_by(
            desc(sort_column) if order == "desc" else asc(sort_column)
        )

    return query


def apply_pagination(query: Query, page: int, size: int) -> Query:
    """
    Sorguya sayfalama uygular.

    Args:
        query: SQLAlchemy sorgusu
        page: Sayfa numarası (1'den başlar)
        size: Sayfa başına kayıt sayısı

    Returns:
        Sayfalanmış sorgu
    """
    skip = (page - 1) * size
    return query.offset(skip).limit(size)


def apply_search(query: Query, model, search: str, search_fields: list[str]) -> Query:
    """
    Birden fazla alana aynı anda arama yapar (OR mantığıyla).

    Örnek: search="Ali" ve search_fields=["name", "email"]
    → name ILIKE '%Ali%' OR email ILIKE '%Ali%'

    Args:
        query: SQLAlchemy sorgusu
        model: SQLAlchemy model sınıfı
        search: Arama terimi
        search_fields: Aranacak alan isimleri listesi

    Returns:
        Filtrelenmiş sorgu
    """
    if not search or not search.strip():
        return query

    search_term = f"%{search.strip()}%"
    conditions = []

    for field_name in search_fields:
        column = getattr(model, field_name, None)
        if column is not None:
            conditions.append(column.ilike(search_term))

    if conditions:
        query = query.filter(or_(*conditions))

    return query


def build_paginated_response(items: list, total: int, params: FilterParams) -> PaginatedResponse:
    """
    Sorgu sonuçlarını PaginatedResponse formatına dönüştürür.

    Args:
        items: Mevcut sayfadaki kayıtlar
        total: Toplam kayıt sayısı
        params: Sayfalama parametreleri

    Returns:
        PaginatedResponse: Standart sayfalanmış response
    """
    return PaginatedResponse(
        items=items,
        total=total,
        page=params.page,
        size=params.size,
        pages=math.ceil(total / params.size) if params.size > 0 else 0,
    )
