from fastapi import WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Dict, Any
import json

from database import SessionLocal
from models import Message, User
from jwt_utils import SECRET_KEY, ALGORITHM

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"✅ User {user_id} CONNECTED | Active: {list(self.active_connections.keys())}")

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"❌ User {user_id} DISCONNECTED | Active: {list(self.active_connections.keys())}")

    async def send_personal_message(self, message: Dict[str, Any], receiver_id: int):
        if receiver_id in self.active_connections:
            try:
                await self.active_connections[receiver_id].send_text(json.dumps(message))
            except Exception as e:
                print(f"Failed to send to {receiver_id}: {e}")

    async def broadcast_status(self, user_id: int, is_online: bool):
        status_msg = {
            "type": "status",
            "user_id": user_id,
            "is_online": is_online
        }
        for conn_user_id, ws in list(self.active_connections.items()):
            if conn_user_id != user_id:
                try:
                    await ws.send_text(json.dumps(status_msg))
                except:
                    pass  # Ignore dead connections

manager = ConnectionManager()

def get_user_id_from_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return int(user_id)
    except (JWTError, ValueError):
        return None

async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = get_user_id_from_token(token)
    if not user_id:
        await websocket.close(code=1008)  # Policy violation
        return

    db: Session = SessionLocal()
    try:
        await manager.connect(user_id, websocket)

        # Update online status
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_online = True
            db.commit()
            await manager.broadcast_status(user_id, True)

        while True:
            data = await websocket.receive_text()
            print(f"📩 {user_id} sent: {data}")

            # Typing indicator
            if data.startswith("typing::"):
                try:
                    receiver_id = int(data.split("::", 1)[1])
                    ws = manager.active_connections.get(receiver_id)
                    if ws:
                        await ws.send_text("typing")
                except ValueError:
                    await websocket.send_text(json.dumps({"error": "Invalid receiver ID"}))
                continue

            # Message handling
            try:
                parts = data.split("::", 1)
                if len(parts) != 2:
                    await websocket.send_text(json.dumps({"error": "Invalid format: receiver_id::message"}))
                    continue

                receiver_id_str, message_text = parts
                receiver_id = int(receiver_id_str)
                message_text = message_text.strip()

                if not message_text:
                    await websocket.send_text(json.dumps({"error": "Empty message"}))
                    continue

                # Save to DB
                msg = Message(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    message=message_text
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                # Send to receiver
                message_data = {
                    "type": "message",
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "message": message_text,
                    "timestamp": msg.timestamp.isoformat()
                }
                await manager.send_personal_message(message_data, receiver_id)

            except ValueError:
                await websocket.send_text(json.dumps({"error": "Invalid receiver ID"}))
            except Exception as e:
                print(f"Message error: {e}")
                await websocket.send_text(json.dumps({"error": "Message processing error"}))

    except WebSocketDisconnect:
        print(f"🔌 {user_id} disconnected")
    finally:
        # Cleanup
        manager.disconnect(user_id)
        if db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_online = False
                db.commit()
            db.close()
        await manager.broadcast_status(user_id, False)

