import { createContext, useContext, useEffect, useState, useRef } from "react";

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const wsRef = useRef(null);

  // ✅ Single WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/chat?token=${token}`
    );

    wsRef.current = socket;

    socket.onopen = () => console.log("WS connected");
    socket.onclose = () => console.log("WS disconnected");
    socket.onerror = (e) => console.error("WS error", e);

    // ✅ handle messages globally
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // 🔥 Online status update
        if (data.type === "status") {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === data.user_id
                ? { ...u, is_online: data.is_online }
                : u
            )
          );
        }

      } catch {
        // ignore non-json
      }
    };

    return () => socket.close();
  }, []);

  const value = {
    users,
    setUsers,
    currentUser,
    setCurrentUser,
    ws: wsRef, // 👈 pass ref (important)
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};