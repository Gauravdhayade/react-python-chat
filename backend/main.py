from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request

from auth import router
from websocket_chat import websocket_endpoint

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket, token: str):
    await websocket_endpoint(websocket, token)


# ---------------- WEBSOCKET ----------------
@app.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket, token: str):
    await websocket_endpoint(websocket, token)

# ---------------- GLOBAL EXCEPTION HANDLER ----------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal Server Error",
            "error": str(exc)
        }
    )
