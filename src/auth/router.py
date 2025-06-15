from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any

from .dependencies import get_current_user

from ..models.database import get_db
from ..schemas.user import Token, User, UserCreate
from ..crud.user_crud import create_user, authenticate_user, get_user_by_username, get_user_by_email
from .security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(tags=["auth"])

@router.post("/signup", response_model=User)
def signup(user: UserCreate, db: Session = Depends(get_db)) -> Any:
    """Create a new user account."""
    # Check if username already exists
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create the user
    return create_user(db=db, user=user)

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    redirect: str = None
) -> Any:
    """
    Authenticate user and return access token.
    
    Args:
        form_data: The OAuth2 password request form containing username and password
        db: Database session
        redirect: Optional URL to redirect to after successful login
        
    Returns:
        dict: Access token and token type, with redirect URL if provided
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    response_data = {
        "access_token": access_token, 
        "token_type": "bearer"
    }
    
    # Include redirect URL in response if provided
    if redirect:
        response_data["redirect"] = redirect
    
    return response_data

@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user
