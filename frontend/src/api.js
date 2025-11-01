import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:3001",
  timeout: 20000,
});

// ---------- existing ----------
export const getSchema = async () => (await API.get("/api/schema")).data;
export const postPredict = async (payload) => (await API.post("/api/predict", payload, { headers:{ "Content-Type":"application/json" }})).data;
export const postPredictText = async (payload, opts={}) => {
  const params = new URLSearchParams(); if (opts.threshold != null) params.set("threshold", String(opts.threshold));
  return (await API.post(`/api/predict_text?${params}`, payload, { headers:{ "Content-Type":"application/json" }})).data;
};
export const postPredictTextPerQuestion = async (payload, opts={}) => {
  const params = new URLSearchParams(); if (opts.threshold != null) params.set("threshold", String(opts.threshold));
  return (await API.post(`/api/predict_text_per_question?${params}`, payload, { headers:{ "Content-Type":"application/json" }})).data;
};
export const getHistory = async () => (await API.get("/api/history")).data; // if you added history backend

// ---------- auth ----------
export const authRegister = async (payload) => (await API.post("/auth/register", payload, { headers:{ "Content-Type":"application/json" }})).data;
export const authLogin = async (payload) => (await API.post("/auth/login", payload, { headers:{ "Content-Type":"application/json" }})).data;
export const authUpdateProfile = async (token, payload) =>
  (await API.patch("/auth/profile", payload, { headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token}` }})).data;

// ---------- tasks ----------
export const listTasks = async (token) =>
  (await API.get("/api/tasks", { headers:{ "Authorization":`Bearer ${token}` }})).data;
export const createTask = async (token, title) =>
  (await API.post("/api/tasks", { title }, { headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token}` }})).data;
export const toggleTask = async (token, id) =>
  (await API.post(`/api/tasks/${id}/complete`, {}, { headers:{ "Authorization":`Bearer ${token}` }})).data;
export const renameTask = async (token, id, title) =>
  (await API.patch(`/api/tasks/${id}`, { title }, { headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token}` }})).data;
export const deleteTask = async (token, id) =>
  (await API.delete(`/api/tasks/${id}`, { headers:{ "Authorization":`Bearer ${token}` }})).data;

// Dayplan (deadline)
export const setDayplan = async (token, dueAtISO) =>
  (await API.post("/api/dayplan", { dueAt: dueAtISO }, { headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token}` }})).data;

export const getDayplan = async (token) =>
  (await API.get("/api/dayplan", { headers:{ "Authorization":`Bearer ${token}` }})).data;

export const getTasksSummary = async (token) =>
  (await API.get("/api/tasks/summary", { headers:{ "Authorization":`Bearer ${token}` }})).data;

// NEW: clears
export const clearTasks = async (token) =>
  (await API.delete("/api/tasks", { headers:{ "Authorization":`Bearer ${token}` }})).data;
export const clearDayplan = async (token) =>
 (await API.delete("/api/dayplan", { headers:{ "Authorization":`Bearer ${token}` }})).data;


// Explain a single row (same schema as /predict). Body must be { data: row }
export const postExplainRow = async (row) =>
  (await API.post(
    "/api/explain",
    { data: row },
    { headers: { "Content-Type": "application/json" } }
  )).data;


export default API;
