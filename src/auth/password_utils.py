from passlib.context import CryptContext

# Initialize password hashing context
def get_pwd_context():
    return CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__ident="2b"  # Force bcrypt version
    )

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
        
        # Get a new context and verify the password
        context = get_pwd_context()
        result = context.verify(plain_password, hashed_password)
        
        if not result:
            print("Password verification failed")
        else:
            print("✅ Password verified successfully")
            
        return result
        
    except Exception as e:
        print(f"❌ Error verifying password: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a password.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        str: The hashed password
    """
    try:
        context = get_pwd_context()
        return context.hash(password)
    except Exception as e:
        print(f"❌ Error hashing password: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
