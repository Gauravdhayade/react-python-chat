# React + Python Real-Time Chat Application

A full-stack real-time chat application built using **React** for the frontend and **FastAPI (Python)** for the backend.  
The application supports JWT-based authentication, real-time messaging using WebSockets, online/offline status, and a WhatsApp-like user interface.

---

## Features

- User Registration & Login
- JWT-based Authentication
- Protected REST APIs
- Real-time chat using WebSockets
- Online / Offline user status
- Typing indicator
- Message timestamps
- Messages stored in database
- Responsive WhatsApp-like UI

---

## 🛠️ Tech Stack

### Frontend
- React
- Axios
- CSS (WhatsApp-like UI)

### Backend
- FastAPI
- WebSockets
- SQLAlchemy
- JWT Authentication
- SQLite / MySQL

---

## 📂 Project Structure

react-python-chat/
│
├── backend/
│ ├── main.py
│ ├── auth.py
│ ├── jwt_utils.py
│ ├── models.py
│ ├── schemas.py
│ ├── database.py
│ ├── websocket_chat.py
│ └── requirements.txt
│
├── frontend/
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ ├── api.js
│ │ └── App.js
│ ├── package.json
│ └── package-lock.json
│
└── README.md


---

## ⚙️ Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload
Backend will run at:

http://127.0.0.1:8000
⚙️ Frontend Setup (React)
cd frontend
npm install
npm start
Frontend will run at:

http://localhost:3000
🔐 Authentication Flow
Register a new user

Login to receive JWT token

Token is used for:

REST API authorization

WebSocket authentication

Only authenticated users can chat

💬 Real-Time Chat
WebSocket connection is established after login.
Messages are sent and received instantly.
Typing indicator is shown in real time.
Online/offline status updates dynamically.

✅ Notes
Virtual environment (venv) and node_modules are excluded from the repository
Application has been tested and runs without errors
Designed as per assignment requirements

👤 Author
Gaurav Dhayade

📄 License
This project is for assignment and evaluation purposes.

