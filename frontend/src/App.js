import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider, { useAuth } from "./auth/AuthContext";

import AuthPage from "./components/AuthPage";
import ProfileForm from "./components/ProfileForm";
import TasksBoard from "./components/TasksBoard";
import SchemaForm from "./components/SchemaForm";
import TextAnalyzer from "./components/TextAnalyzer";
import ChatInterview from "./components/ChatInterview"; // NEW (WhatsApp-style)
import NavBar from "./components/NavBar";
import GameBalloon from "./components/GameBalloon";
import HomeCongrats from "./components/HomeCongrats";
import "./index.css";

function Private({ children }) {
  const { user } = useAuth();
  if (!user) return <AuthPage />;
  return (
    <>
      <NavBar />
      <div className="pagecontainer">{children}</div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* <Route path="/" element={<Navigate to="/chat" replace />} /> */}
          <Route path="/chat" element={<Private><ChatInterview /></Private>} />
          <Route path="/tasks" element={<Private><TasksBoard /></Private>} />
          <Route path="/predict" element={<Private><SchemaForm /></Private>} />
          <Route path="/text" element={<Private><TextAnalyzer /></Private>} />
          <Route path="/profile" element={<Private><ProfileForm /></Private>} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        <Route path="/" element={<Navigate to="/tasks" replace />} />
<Route path="/game" element={<Private><GameBalloon /></Private>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
