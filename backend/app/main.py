"""
UniTrack AI — FastAPI Uygulama Giriş Noktası.

Tüm router'ları, middleware'leri ve exception handler'ları burada birleştirir.
Uvicorn ile çalıştırmak için: uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.common.exception_handlers import register_exception_handlers

# Feature router'ları
from app.features.auth.auth_controller import router as auth_router
from app.features.user.user_controller import router as user_router
from app.features.project.project_controller import router as project_router
from app.features.project_member.project_member_controller import router as project_member_router
from app.features.task.task_controller import router as task_router
from app.features.report.report_controller import router as report_router
from app.features.ai.ai_controller import router as ai_router
from app.features.course.course_controller import router as course_router
from app.features.notification.notification_controller import router as notification_router
from app.features.file.file_controller import router as file_router
from app.features.admin.admin_controller import router as admin_router


# --- Uygulama Oluşturma ---
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "UniTrack AI — Üniversite öğrencileri ve öğretmenleri için "
        "AI destekli proje yönetim sistemi."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)


# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Global Exception Handler'lar ---
register_exception_handlers(app)


# --- Router Kayıtları ---
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(project_router)
app.include_router(project_member_router)
app.include_router(task_router)
app.include_router(report_router)
app.include_router(ai_router)
app.include_router(course_router)
app.include_router(notification_router)
app.include_router(file_router)
app.include_router(admin_router)


# --- Health Check ---
@app.get("/", tags=["Health"])
def health_check():
    """
    Uygulama sağlık kontrolü.
    API'nin çalışıp çalışmadığını doğrulamak için kullanılır.
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "debug": settings.DEBUG,
    }
