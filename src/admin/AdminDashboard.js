// src/admin/AdminDashboard.js
import React from "react";
import { Link } from "react-router-dom";
import "./Admin.css";

export default function AdminDashboard() {
  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="admin-menu">
        <Link to="/admin/users" className="admin-card">
          <h2>Users</h2>
          <p>View all registered users</p>
        </Link>

        <Link to="/admin/messages" className="admin-card">
          <h2>Messages</h2>
          <p>View all user conversations</p>
        </Link>
      </div>
    </div>
  );
}
