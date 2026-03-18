import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/components/Chat.css";

export default function Chat() {
  const { id } = useParams();
  const location = useLocation();

  const myId = Number(localStorage.getItem("user_id"));

  const [userName, setUserName] = useState(location.state?.name || "User");
  const [isOnline, setIsOnline] = useState(location.state?.is_online || false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const ws = useRef(null);
  const endRef = useRef(null);

  // ✅ Fetch user info
  useEffect(() => {
    if (location.state) return;

    api.get("/auth/users")   // 🔥 FIXED
      .then((res) => {
        const user = res.data.find((u) => u.id === Number(id));
        if (user) {
          setUserName(user.username || user.name);
          setIsOnline(user.is_online);
        }
      })
      .catch(console.error);
  }, [id, location.state]);

  // ✅ Load messages + websocket
  useEffect(() => {
    api.get(`/auth/messages/${id}`)   // 🔥 FIXED
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
      .catch(console.error);

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/chat?token=${token}`);
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

  // ✅ Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Send message
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

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h3>{userName}</h3>
          <span className={isOnline ? "online" : "offline"}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.fromMe ? "me" : "other"}`}>
            <div className="bubble">
              {m.text}
              <span className="time">{m.time}</span>
            </div>
          </div>
        ))}

        {typing && <div className="typing">Typing...</div>}
        <div ref={endRef}></div>
      </div>

      <div className="chat-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
        />
        <button onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
}