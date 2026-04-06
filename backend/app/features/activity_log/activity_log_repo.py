"""
ActivityLog repository modülü.
"""

from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.features.activity_log.activity_log_model import ActivityLog


class ActivityLogRepo(BaseRepository[ActivityLog]):
    def __init__(self, db: Session):
        super().__init__(ActivityLog, db)
