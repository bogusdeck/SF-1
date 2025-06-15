import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from .models.user import Base, User
from .models.database import engine, SessionLocal
from .auth.security import get_password_hash

load_dotenv()

def init_db():
    """Initialize the database with tables and an admin user if they don't exist."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create a session
    db = SessionLocal()
    
    # Check if admin user exists
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        # Create admin user
        hashed_password = get_password_hash("admin123")
        admin_user = User(
            email="admin@example.com",
            username="admin",
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("Created admin user with username: admin, password: admin123")
    
    db.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")
