from __future__ import annotations

import base64
import os
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken


ROOT = Path(__file__).resolve().parent
KEY_PATH = Path(os.getenv("PLATFORM_SECRET_KEY_PATH", str(ROOT / "data" / ".platform-secret")))


def _fernet() -> Fernet:
    raw = os.getenv("PLATFORM_SECRET_KEY", "").strip()
    if raw:
        key = raw.encode("ascii")
    else:
        KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not KEY_PATH.exists():
            KEY_PATH.write_bytes(Fernet.generate_key())
        key = KEY_PATH.read_bytes().strip()
    # Accept a raw 32-byte secret for deployment environments.
    if len(key) != 44:
        key = base64.urlsafe_b64encode(key[:32].ljust(32, b"0"))
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeDecodeError) as exc:
        raise ValueError("stored secret cannot be decrypted") from exc
