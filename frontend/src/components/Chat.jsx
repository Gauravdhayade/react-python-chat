import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../api";
import "./Chat.css";

export default function Chat() {
  const { id } = useParams();
  const location = useLocation();

  const myId = Number(localStorage.getItem("user_id"));

  /* ===============================
     RECEIVER INFO (SAFE)
     =============================== */
  const [userName, setUserName] = useState(
    location.state?.name || ""
  );
  const [isOnline, setIsOnline] = useState(
    location.state?.is_online || false
  );

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const ws = useRef(null);
  const endRef = useRef(null);

  /* ===============================
     FETCH USER INFO (ON REFRESH)
     =============================== */
  useEffect(() => {
    if (location.state?.name) return; // already have data

    api.get("/users")
      .then((res) => {
        const u = res.data.find((x) => x.id === Number(id));
        if (u) {
          setUserName(u.name);
          setIsOnline(u.is_online);
        }
      })
      .catch(() => {});
  }, [id, location.state]);

  /* ===============================
     LOAD MESSAGES + CONNECT WS
     =============================== */
  useEffect(() => {
    api.get(`/messages/${id}`)
      .then((res) => {
        setMessages(
          res.data.map((m) => ({
            fromMe: m.sender_id === myId,
            text: m.message,
            time: new Date(m.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
        );
      })
      .catch(() => {});

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/chat?token=${token}`
    );
    ws.current = socket;

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [
          ...prev,
          {
            fromMe: data.sender_id === myId,
            text: data.message,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } catch {
        if (e.data === "typing") {
          setTyping(true);
          setTimeout(() => setTyping(false), 1200);
        }
      }
    };

    return () => socket.close();
  }, [id, myId]);

  /* ===============================
     AUTO SCROLL
     =============================== */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* ===============================
     SEND MESSAGE
     =============================== */
  const sendMessage = () => {
    if (!text.trim()) return;
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    ws.current.send(`${id}::${text}`);

    setMessages((prev) => [
      ...prev,
      {
        fromMe: true,
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setText("");
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(`typing::${id}`);
    }
  };

  return (
    <div className="chat-area">
      {/* ================= HEADER ================= */}
      <div className="chat-header">
        <div className="chat-user">
          <div className="avatar">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>

          <div className="user-info">
            <div className="chat-username">
              {userName || "User"}
            </div>
            <div className={`status ${isOnline ? "online" : ""}`}>
              {isOnline ? "online" : "offline"}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MESSAGES ================= */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.fromMe ? "me" : "other"}`}>
            <div className="bubble">
              <div className="message-text">{m.text}</div>
              <span className="time">{m.time}</span>
            </div>
          </div>
        ))}

        {typing && (
          <div className="typing">
            {userName || "User"} is typing...
          </div>
        )}

        <div ref={endRef}></div>
      </div>

      {/* ================= INPUT ================= */}
      <div className="chat-input">
        <input
          value={text}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message"
        />
        <button onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
}
