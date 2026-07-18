from sqlalchemy.orm import Session
from typing import Optional

from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate
from ..auth.password_utils import get_password_hash, verify_password

def get_user(db: Session, user_id: int) -> Optional[User]:
    """Get a user by ID."""
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email."""
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get a user by username."""
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    """Get a list of users with pagination."""
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user."""
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    """Update a user's information."""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    """Delete a user."""
    db_user = get_user(db, user_id)
    if not db_user:
        return False
    db.delete(db_user)
    db.commit()
    return True

def authenticate_user(db: Session, username: str, password: str):
    """
    Authenticate a user with the given username and password.
    
    Args:
        db: Database session
        username: The username to authenticate
        password: The plain text password to verify
        
    Returns:
        User: The authenticated user if successful, None otherwise
    """
    print(f"\n=== Authentication Attempt ===")
    print(f"Username/Email: {username}")
    print(f"Password provided: {'*' * len(password)}")
    
    # First try to find user by username
    user = get_user_by_username(db, username=username)
    user_source = "username"
    
    # If not found by username, try by email
    if not user and "@" in username:
        print(f"User not found by username, trying email: {username}")
        user = get_user_by_email(db, email=username)
        user_source = "email"
    
    if not user:
        print(f"❌ User not found by {user_source}: {username}")
        return None
    
    print(f"✅ Found user by {user_source}")
    print(f"User ID: {user.id}")
    print(f"Stored hash: {user.hashed_password[:15]}...")
    print("Verifying password...")
    
    try:
        # Verify the password using the imported verify_password function
        if not verify_password(password, user.hashed_password):
            print("❌ Password verification failed")
            return None
        
        print("✅ Password verified successfully")
        return user
        
    except Exception as e:
        print(f"❌ Error during password verification: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
