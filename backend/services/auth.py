"""
Auth — login com JWT simples.
Credenciais definidas no .env: AUTH_USERNAME e AUTH_PASSWORD
"""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jose import jwt, JWTError
from passlib.context import CryptContext

SECRET_KEY = "meu-tico-secret-key-mude-em-producao"
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 72

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _load_env():
    env_file = Path(__file__).parent.parent / ".env"
    env = {}
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def get_credentials() -> tuple[str, str]:
    env = _load_env()
    username = env.get("AUTH_USERNAME", "admin")
    password = env.get("AUTH_PASSWORD", "meutico123")
    return username, password


def verify_login(username: str, password: str) -> bool:
    valid_user, valid_pass = get_credentials()
    return username == valid_user and password == valid_pass


def create_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
