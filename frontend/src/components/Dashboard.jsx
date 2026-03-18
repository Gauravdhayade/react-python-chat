import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../contexts/ChatContext";
import api from "../services/api";
import "../styles/components/Dashboard.css";

export default function Dashboard() {
  const { users: contextUsers, setUsers } = useChat();
  const [users, setLocalUsers] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/users");
        setLocalUsers(res.data);
        setUsers(res.data);
      } catch (err) {
        console.error(err);

        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
        }
      }
    };

    fetchUsers();
  }, [navigate, setUsers]);

  // ✅ Sync context users
  useEffect(() => {
    if (contextUsers.length > 0) {
      setLocalUsers(contextUsers);
    }
  }, [contextUsers]);

  // ✅ Logout
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-logo">ChatPro</h1>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="user-list">
          {filteredUsers.map((u) => (
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
              <div className="user-avatar">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div>{u.name}</div>
                <div>{u.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="empty-panel">
        <h2>Select a chat</h2>
      </div>
    </div>
  );
}