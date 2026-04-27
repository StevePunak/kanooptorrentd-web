"""Server-side logging for the FastAPI backend.

Writes a rotating file at ~/.local/share/kanooptorrentd-web/kanooptorrentd-web.log
plus a console stream so dev-mode terminals still get output. Captures the
uvicorn loggers (uvicorn, uvicorn.access, uvicorn.error) so HTTP requests and
lifecycle events land in the file too.

These logs are for post-hoc debugging — they are not exposed via the API.
"""
import logging
import logging.handlers
import os
from pathlib import Path

LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
DEFAULT_LEVEL = logging.INFO

_configured = False


def _log_path() -> Path:
    base = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    return base / "kanooptorrentd-web" / "kanooptorrentd-web.log"


def configure_logging() -> None:
    """Idempotent. Safe to call from module load and again from lifespan."""
    global _configured
    if _configured:
        return
    _configured = True

    log_path = _log_path()
    log_path.parent.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

    file_handler = logging.handlers.RotatingFileHandler(
        log_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(DEFAULT_LEVEL)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(DEFAULT_LEVEL)

    root = logging.getLogger()
    root.setLevel(DEFAULT_LEVEL)
    # Reset handlers in case uvicorn or FastAPI already attached its own —
    # we want the same file/console pair across the whole process.
    root.handlers = [file_handler, console_handler]

    # Ensure uvicorn's loggers propagate to the root logger so their output
    # also lands in our file handler. uvicorn installs its own console handler
    # by default; remove it to avoid duplicate console lines.
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True
        lg.setLevel(DEFAULT_LEVEL)

    logging.getLogger(__name__).info("logging configured: %s", log_path)
