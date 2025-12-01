// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Client-side pages
import Welcome from "./Welcome";
import Chat from "./Chat";

// Admin pages
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminMessages from "./admin/AdminMessages";
import AdminChat from "./admin/AdminChat";

import "./App.css";

// TEMPORARY ADMIN CHECK
const isAdmin = true; // while testing

function App() {
  return (
    <Router>
      <Routes>

        {/* Public Pages */}
        <Route path="/" element={<Welcome />} />
        <Route path="/chat" element={<Chat />} />

        {/* Admin Pages */}
        <Route
          path="/admin"
          element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/admin/users"
          element={isAdmin ? <AdminUsers /> : <Navigate to="/" />}
        />
        <Route
          path="/admin/messages"
          element={isAdmin ? <AdminMessages /> : <Navigate to="/" />}
        />

        {/* Single admin chat */}
        <Route
          path="/admin/chat/:userId"
          element={isAdmin ? <AdminChat /> : <Navigate to="/" />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}

export default App;
