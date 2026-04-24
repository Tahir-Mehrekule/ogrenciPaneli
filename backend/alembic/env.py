"""
Alembic ortam (environment) yapılandırması.

Bu dosya Alembic'e şunu söyler:
1. Veritabanı URL'si nerede (settings'ten)?
2. Hangi modeller var (Base.metadata)?
3. Online ve offline migration modları nasıl çalışır?
"""

import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# backend/ dizinini Python path'ine ekle → "app.xxx" importları çalışsın
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Uygulama ayarları
from app.core.config import settings
from app.core.database import Base

# Tüm modelleri import et → Base.metadata'ya kayıt olsunlar
# Bu olmadan Alembic tabloları göremez!
from app.features.auth.auth_model import User  # noqa: F401
from app.features.project.project_model import Project  # noqa: F401
from app.features.project_member.project_member_model import ProjectMember  # noqa: F401
from app.features.task.task_model import Task  # noqa: F401
from app.features.report.report_model import Report  # noqa: F401
from app.features.course.course_model import Course, CourseEnrollment  # noqa: F401
from app.features.notification.notification_model import Notification  # noqa: F401
from app.features.file.file_model import FileUpload  # noqa: F401
from app.features.activity_log.activity_log_model import ActivityLog  # noqa: F401
from app.features.department.department_model import Department  # noqa: F401
from app.features.project_category.project_category_model import ProjectCategory  # noqa: F401
from app.features.student_prefix.student_prefix_model import StudentYearPrefix  # noqa: F401
from app.features.user_department.user_department_model import UserDepartment  # noqa: F401

# Alembic Config objesi (alembic.ini'den okunur)
config = context.config

# Logging yapılandırması
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Veritabanı URL'sini settings'ten ayarla
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Hedef metadata → otomatik migration üretimi için
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Offline mod: DB bağlantısı olmadan migration SQL'i üretir.
    Çıktı: migration dosyalarına SQL komutları yazılır.
    Kullanım: alembic upgrade head --sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Online mod: Gerçek DB bağlantısıyla migration çalıştırır.
    Kullanım: alembic upgrade head
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,       # Sütun tipi değişikliklerini algıla
            compare_server_default=True,  # Default değer değişikliklerini algıla
        )

        with context.begin_transaction():
            context.run_migrations()


# Offline mi online mi?
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
