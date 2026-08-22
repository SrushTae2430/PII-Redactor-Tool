import time
import jwt
import hashlib
from typing import Optional, Dict

SECRET_KEY = "pii-shield-zero-retention-local-secret-key"
ALGORITHM = "HS256"
SESSION_TIMEOUT_MINUTES = 15

# In-memory session store (Zero persistent storage)
in_memory_users: Dict[str, str] = {
    "guest@piishield.local": hashlib.sha256("guest123".encode()).hexdigest(),
    "security@corp.com": hashlib.sha256("admin123".encode()).hexdigest()
}
active_sessions: Dict[str, float] = {}

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(email: str) -> str:
    now = time.time()
    expires_at = now + (SESSION_TIMEOUT_MINUTES * 60)
    payload = {
        "sub": email,
        "iat": now,
        "exp": expires_at
    }
    active_sessions[email] = now
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        last_active = active_sessions.get(email, 0)
        # 15 minutes session check
        if time.time() - last_active > SESSION_TIMEOUT_MINUTES * 60:
            if email in active_sessions:
                del active_sessions[email]
            return None
        # Refresh active timestamp
        active_sessions[email] = time.time()
        return payload
    except Exception:
        return None

def register_user(email: str, password: str) -> bool:
    if email in in_memory_users:
        return False
    in_memory_users[email] = hash_password(password)
    return True

def authenticate_user(email: str, password: str) -> bool:
    hashed = in_memory_users.get(email)
    if not hashed:
        return False
    return verify_password(password, hashed)

def wipe_session_data(email: str):
    if email in active_sessions:
        del active_sessions[email]
