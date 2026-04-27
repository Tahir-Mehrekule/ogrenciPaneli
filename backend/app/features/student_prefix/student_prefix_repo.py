from sqlalchemy.orm import Session
from app.common.base_repo import BaseRepository
from app.features.student_prefix.student_prefix_model import StudentYearPrefix


class StudentPrefixRepo(BaseRepository[StudentYearPrefix]):

    def __init__(self, db: Session):
        super().__init__(StudentYearPrefix, db)

    def get_by_prefix(self, prefix: str) -> StudentYearPrefix | None:
        return (
            self.db.query(StudentYearPrefix)
            .filter(StudentYearPrefix.prefix == prefix)
            .filter(StudentYearPrefix.is_active == True)
            .filter(StudentYearPrefix.is_deleted == False)
            .first()
        )

    def get_all_active(self) -> list[StudentYearPrefix]:
        return (
            self.db.query(StudentYearPrefix)
            .filter(StudentYearPrefix.is_active == True)
            .filter(StudentYearPrefix.is_deleted == False)
            .order_by(StudentYearPrefix.entry_year.desc())
            .all()
        )

    def match_student_no(self, student_no: str) -> StudentYearPrefix | None:
        """9 haneli öğrenci no'sunun ilk 6 hanesini prefix tablosunda arar."""
        if not student_no or len(student_no) < 6:
            return None
        return self.get_by_prefix(student_no[:6])
