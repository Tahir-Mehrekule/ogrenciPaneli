"""
Yapılandırılmış Logging Modülü (K-3)

JSON formatında structured logging sağlar.
- Development: renkli, okunabilir (renkli metin çıktı)
- Production: JSON format (log aggregation servislerine uyumlu)

Kullanım:
    from app.core.logging_config import get_logger
    logger = get_logger(__name__)
    logger.info("İşlem başladı", extra={"user_id": str(user.id)})
"""

import logging
import logging.config
import json
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """
    Her log satırını JSON nesnesi olarak yazar.

    Örnek çıktı:
    {"timestamp": "2026-05-13T12:00:00Z", "level": "INFO",
     "logger": "app.features.auth", "message": "Kullanıcı girişi", "user_id": "..."}
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": self.formatMessage(record),
        }

        # Exception varsa ekle
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Extra alanlar (user_id, request_id vb.)
        skip_keys = {
            "name", "msg", "args", "levelname", "levelno", "pathname",
            "filename", "module", "exc_info", "exc_text", "stack_info",
            "lineno", "funcName", "created", "msecs", "relativeCreated",
            "thread", "threadName", "processName", "process", "message",
            "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in skip_keys:
                log_obj[key] = value

        return json.dumps(log_obj, ensure_ascii=False, default=str)


def setup_logging(debug: bool = False) -> None:
    """
    Uygulama başlangıcında çağrılır.

    Args:
        debug: True → renkli metin (development), False → JSON (production)
    """
    log_level = "DEBUG" if debug else "INFO"

    if debug:
        # Development: standart renkli formatter
        formatter_class = "logging.Formatter"
        fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        datefmt = "%H:%M:%S"
    else:
        # Production: JSON formatter
        formatter_class = "app.core.logging_config.JSONFormatter"
        fmt = None
        datefmt = None

    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": formatter_class,
                **({"format": fmt, "datefmt": datefmt} if fmt else {}),
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stdout",
            }
        },
        "root": {
            "level": log_level,
            "handlers": ["console"],
        },
        "loggers": {
            # FastAPI/uvicorn gürültüsünü azalt
            "uvicorn": {"level": "WARNING", "propagate": True},
            "uvicorn.error": {"level": "WARNING", "propagate": True},
            "uvicorn.access": {"level": "WARNING", "propagate": True},
            # SQLAlchemy sorgu logları (DEBUG'da açık, PRODUCTION'da kapalı)
            "sqlalchemy.engine": {"level": "WARNING", "propagate": True},
            # Uygulama logları
            "app": {"level": log_level, "propagate": True},
        },
    }

    logging.config.dictConfig(config)


def get_logger(name: str) -> logging.Logger:
    """
    Feature modülleri için logger oluşturur.

    Kullanım:
        logger = get_logger(__name__)
        logger.info("Task oluşturuldu", extra={"task_id": str(task.id)})
    """
    return logging.getLogger(name)
