from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import SessionLocal
from models import User, Message
from schemas import RegisterSchema
from jwt_utils import create_access_token, verify_token

router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- REGISTER ----------
@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = pwd.hash(data.password[:72])

    new_user = User(
        name=data.name,
        email=data.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }


# ---------- LOGIN ----------
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not pwd.verify(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name
    }


# ---------- USERS ----------
@router.get("/users")
def get_users(
    user_id: int = Depends(verify_token),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.id != user_id).all()

    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_online": u.is_online
        }
        for u in users
    ]


# ---------- MESSAGES ----------
@router.get("/messages/{receiver_id}")
def get_messages(
    receiver_id: int,
    user_id: int = Depends(verify_token),
    db: Session = Depends(get_db)
):
    return db.query(Message).filter(
        ((Message.sender_id == user_id) & (Message.receiver_id == receiver_id)) |
        ((Message.sender_id == receiver_id) & (Message.receiver_id == user_id))
    ).order_by(Message.timestamp).all()