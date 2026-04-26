import os

DAEMON_BASE_URL = os.environ.get("KANOOPTORRENTD_URL", "http://127.0.0.1:8901")
DAEMON_TIMEOUT_SECONDS = float(os.environ.get("KANOOPTORRENTD_TIMEOUT", "5"))
