import os
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
import uvicorn
from datetime import timedelta

# Import models and database
from src.models.database import Base, engine, get_db
from src.models.user import User

# Import schemas
from src.schemas.user import Token, User as UserSchema, UserCreate

# Import routers
from src.auth.router import router as auth_router
from src.auth.dependencies import get_current_active_user

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="Music Sync API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# Include API routes
try:
    from api.index import router as api_router
    app.include_router(api_router, prefix="/api")
except ImportError:
    print("API router not found. Running without API routes.")

# Routes
@app.get("/", response_class=HTMLResponse)
async def landing_page(request: Request):
    return templates.TemplateResponse("landing.html", {"request": request})

@app.get("/app", response_class=HTMLResponse)
async def app_page(request: Request):
    # Redirect to lobby for now
    return RedirectResponse(url="/lobby")

@app.get("/lobby", response_class=HTMLResponse)
async def lobby_page(request: Request):
    # The actual authentication check is done client-side in the template
    return templates.TemplateResponse("lobby.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, error: Optional[str] = None, redirect: Optional[str] = None):
    return templates.TemplateResponse("login.html", {
        "request": request,
        "error": error,
        "redirect": redirect
    })

@app.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

# Protected route example
@app.get("/api/users/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Redirect /index.html to /app for backward compatibility
@app.get("/index.html", response_class=HTMLResponse)
async def redirect_to_app():
    return RedirectResponse(url="/app")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    if request.url.path.startswith('/api/'):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    # For non-API routes, you might want to redirect to a login page or show an error page
    return templates.TemplateResponse(
        "error.html",
        {"request": request, "status_code": exc.status_code, "detail": exc.detail},
        status_code=exc.status_code
    )

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    # Initialize database
    from src.init_db import init_db
    init_db()
    print("Application startup complete")