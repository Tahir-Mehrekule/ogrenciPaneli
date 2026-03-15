


from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.auth.auth_model import User
from app.common.enums import UserRole


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
