from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import timedelta
from typing import Any, List

from ..models.database import get_db
from ..models.user import User as UserModel
from ..schemas.user import Token, User, UserCreate
from ..crud.user_crud import create_user, get_user_by_username, get_user_by_email
from .security import (
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES, 
    get_current_user,
    verify_password
)

router = APIRouter(tags=["auth"])

@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(
    user: UserCreate, 
    db: Session = Depends(get_db),
    redirect: str = None
) -> dict:
    """
    Create a new user account.
    
    Args:
        user: User registration data
        db: Database session
        redirect: Optional URL to redirect to after successful signup
        
    Returns:
        dict: Success message and redirect URL if provided
    """
    try:
        # Check if username already exists
        db_user = get_user_by_username(db, username=user.username)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Registration failed",
                    "error": "Username already registered",
                    "field": "username"
                }
            )
        
        # Check if email already exists
        db_user = get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Registration failed",
                    "error": "Email already registered",
                    "field": "email"
                }
            )
        
        # Create the user
        created_user = create_user(db=db, user=user)
        
        # Prepare response
        response_data = {
            "success": True,
            "message": "Account created successfully. Redirecting to login...",
            "user_id": created_user.id,
            "username": created_user.username,
            "email": created_user.email
        }
        
        # Include redirect URL in response if provided
        if redirect:
            response_data["redirect"] = f"/login?success=Account+created+successfully&redirect={redirect}"
        else:
            response_data["redirect"] = "/login?success=Account+created+successfully"
            
        return response_data
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions as they are properly formatted
        raise http_exc
    except Exception as e:
        # Handle any other unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Registration failed",
                "error": "An unexpected error occurred. Please try again.",
                "details": str(e)
            }
        )

@router.get("/debug/users", response_model=List[User])
async def debug_list_users(db: Session = Depends(get_db)):
    """Debug endpoint to list all users (temporary)"""
    users = db.query(UserModel).all()
    return users

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
    try:
        identifier = form_data.username
        password = form_data.password
        
        print(f"Login attempt for identifier: {identifier}")
        
        # First try to find user by username or email
        user = None
        
        # Check if the identifier is an email
        if '@' in identifier:
            print(f"Checking for email: {identifier}")
            user = get_user_by_email(db, identifier)
        else:
            print(f"Checking for username: {identifier}")
            user = get_user_by_username(db, identifier)
        
        # If user not found, try the other method
        if not user and '@' not in identifier:
            print(f"User not found by username, trying email: {identifier}")
            user = get_user_by_email(db, identifier)
        elif not user:
            print(f"User not found by email, trying username: {identifier}")
            user = get_user_by_username(db, identifier)
        
        if not user:
            print(f"User not found: {identifier}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "message": "Incorrect username/email or password",
                    "field": "username"
                },
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify the password
        print(f"Found user: {user.username}, verifying password...")
        if not verify_password(password, user.hashed_password):
            print("Password verification failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "message": "Incorrect username/email or password",
                    "field": "password"
                },
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"User {user.username} authenticated successfully")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id}, 
            expires_delta=access_token_expires
        )
        
        response_data = {
            "access_token": access_token, 
            "token_type": "bearer"
        }
        
        # Include redirect URL in response if provided
        if redirect:
            response_data["redirect"] = redirect
            
        return response_data
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions as-is
        raise http_exc
        
    except Exception as e:
        # Log the error for debugging
        print(f"Unexpected error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "An unexpected error occurred during login",
                "error": str(e)
            }
        )
    
    return response_data

@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user
