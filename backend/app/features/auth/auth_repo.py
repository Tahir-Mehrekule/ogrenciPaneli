


from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.auth.auth_model import User
from app.common.enums import UserRole, ApprovalStatus


class AuthRepo(BaseRepository[User]):

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> User | None:
        return (
            self.db.query(User)
            .filter(User.email == email.lower().strip())
            .filter(User.is_active == True)
            .first()
        )

    def get_by_role(self, role: UserRole) -> list[User]:
        return (
            self.db.query(User)
            .filter(User.role == role)
            .filter(User.is_active == True)
            .all()
        )

    def email_exists(self, email: str) -> bool:
        user = (
            self.db.query(User)
            .filter(User.email == email.lower().strip())
            .first()
        )
        return user is not None

    def student_no_exists(self, student_no: str) -> bool:
        """Verilen öğrenci numarası zaten kayıtlı mı kontrol eder."""
        user = (
            self.db.query(User)
            .filter(User.student_no == student_no)
            .first()
        )
        return user is not None

    def get_by_student_no(self, student_no: str) -> User | None:
        """Öğrenci numarası ile kullanıcı getirir."""
        return (
            self.db.query(User)
            .filter(User.student_no == student_no)
            .filter(User.is_active == True)
            .first()
        )

    def get_pending_students(self) -> list[User]:
        """Onay bekleyen (PENDING) öğrencileri listeler."""
        return (
            self.db.query(User)
            .filter(User.approval_status == ApprovalStatus.PENDING)
            .filter(User.role == UserRole.STUDENT)
            .filter(User.is_active == True)
            .order_by(User.created_at.asc())
            .all()
        )
