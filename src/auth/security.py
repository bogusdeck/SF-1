from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from ..models.database import get_db
from ..models.user import User
from .password_utils import verify_password, get_password_hash

# Import get_user_by_username with a local import to avoid circular imports
def get_user_by_username(db: Session, username: str) -> Optional[User]:
    from ..crud.user_crud import get_user_by_username as _get_user_by_username
    return _get_user_by_username(db, username)

load_dotenv()

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to verify against
        
    Returns:
        bool: True if the password matches, False otherwise
    """
    if not plain_password or not hashed_password:
        print("Error: Missing password or hash")
        return False
        
    try:
        # Debug logging
        print(f"Verifying password. Hash: {hashed_password[:10]}...")
        
        # Verify the password
        result = pwd_context.verify(plain_password, hashed_password)
        
        if not result:
            print("Password verification failed")
        else:
            print("Password verified successfully")
            
        return result
        
    except Exception as e:
        print(f"Error verifying password: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """
    Verify a JWT token and return the payload if valid.
    
    Args:
        token: The JWT token to verify
        
    Returns:
        dict: The decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        print(f"Token verification failed: {str(e)}")
        return None

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from the JWT token.
    
    Args:
        token: The JWT token from the Authorization header
        db: Database session
        
    Returns:
        User: The authenticated user
        
    Raises:
        HTTPException: If the token is invalid or the user doesn't exist
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        print(f"Verifying token: {token[:20]}...")
        payload = verify_token(token)
        if payload is None:
            print("Token verification failed")
            raise credentials_exception
            
        username: str = payload.get("sub")
        if username is None:
            print("No username in token")
            raise credentials_exception
            
    except JWTError as e:
        print(f"JWT Error: {str(e)}")
        raise credentials_exception
    
    # Get user from database
    user = get_user_by_username(db, username=username)
    if user is None:
        print(f"User not found: {username}")
        raise credentials_exception
        
    return user
