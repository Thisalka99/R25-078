import React from "react";
import { useAuth } from "./AuthContext";

export default function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <div className="card">Please log in to continue.</div>;
  return children;
}
