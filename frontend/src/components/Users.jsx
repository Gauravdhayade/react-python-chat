import { useEffect, useState } from "react";
import api from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    api.get("/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then(res => setUsers(res.data))
    .catch(() => alert("Unauthorized"));
  }, []);

  return (
    <div>
      <h2>Users</h2>
      {users.map(u => (
        <div key={u.id}>{u.name} ({u.email})</div>
      ))}
    </div>
  );
}
