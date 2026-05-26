import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = os.getenv("JWT_SECRET", "careerpath-secret-change-in-production")
ALGORITHM  = "HS256"
TOKEN_DAYS = 30


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: str, email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": exp},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
