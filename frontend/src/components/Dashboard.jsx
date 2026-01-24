import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Dashboard.css";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  /* ===============================
     FETCH USERS
     =============================== */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error();

        const res = await api.get("/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(res.data);
      } catch {
        localStorage.clear();
        navigate("/login");
      }
    };

    fetchUsers();
  }, [navigate]);

  /* ===============================
     LOGOUT
     =============================== */
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      {/* ================= LEFT SIDEBAR ================= */}
      <div className="sidebar">
        {/* HEADER */}
        <div className="sidebar-header">
          <h3>Chats</h3>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>

        {/* USER LIST */}
        <div className="user-list">
          {users.length === 0 && (
            <p className="no-users">No users found</p>
          )}

          {users.map((u) => (
            <div
              key={u.id}
              className="user-row"
              onClick={() =>
                navigate(`/chat/${u.id}`, {
                  state: {
                    name: u.name,
                    is_online: u.is_online,
                  },
                })
              }
            >
              {/* LEFT */}
              <div className="user-info">
                <div className="username">{u.name}</div>
                <div className="email">{u.email}</div>
              </div>

              {/* RIGHT DOT */}
              <span
                className={`dot ${u.is_online ? "online" : ""}`}
                title={u.is_online ? "Online" : "Offline"}
              ></span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="empty-panel">
        👈 Select a chat to start messaging
      </div>
    </div>
  );
}
