from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from jose import jwt
import json

from database import SessionLocal
from models import Message, User
from jwt_utils import SECRET_KEY, ALGORITHM


class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print("✅ CONNECTED:", self.active_connections.keys())

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)
        print("❌ DISCONNECTED:", user_id)


manager = ConnectionManager()


def get_user_id_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])   # 👈 sub MUST be string in token
    except Exception as e:
        print("JWT ERROR:", e)
        return None


async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = get_user_id_from_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return

    db: Session = SessionLocal()
    await manager.connect(user_id, websocket)

    # online true
    db.query(User).filter(User.id == user_id).update({"is_online": True})
    db.commit()

    try:
        while True:
            data = await websocket.receive_text()
            print("📩 RECEIVED:", data)

            # typing
            if data.startswith("typing::"):
                rid = int(data.split("::")[1])
                ws = manager.active_connections.get(rid)
                if ws:
                    await ws.send_text("typing")
                continue

            receiver_id, message_text = data.split("::", 1)

            # save DB
            msg = Message(
                sender_id=user_id,
                receiver_id=int(receiver_id),
                message=message_text
            )
            db.add(msg)
            db.commit()
            print("💾 SAVED")

            # send receiver
            ws = manager.active_connections.get(int(receiver_id))
            if ws:
                await ws.send_text(json.dumps({
                    "sender_id": user_id,
                    "message": message_text
                }))

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id)
        db.query(User).filter(User.id == user_id).update({"is_online": False})
        db.commit()
        db.close()
