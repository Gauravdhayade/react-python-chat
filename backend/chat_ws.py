from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from database import SessionLocal
from models import Message
from jwt_utils import SECRET_KEY, ALGORITHM

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, receiver_id: int):
        if receiver_id in self.active_connections:
            await self.active_connections[receiver_id].send_text(message)

manager = ConnectionManager()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user_id_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except JWTError:
        return None

async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            receiver_id, message_text = data.split("::")

            msg = Message(
                sender_id=user_id,
                receiver_id=int(receiver_id),
                message=message_text
            )
            db.add(msg)
            db.commit()

            await manager.send_personal_message(
                f"{user_id}: {message_text}",
                int(receiver_id)
            )

    except WebSocketDisconnect:
        manager.disconnect(user_id)
