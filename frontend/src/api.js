import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// Auth
export const registerUser = (userData) => API.post('/auth/register', userData);
export const loginUser = (userData) => API.post('/auth/login', userData);

// Task
export const addTask = (taskData) => API.post('/task/add', taskData);
export const getTasks = (userId) => API.get(`/task/all?userId=${userId}`);
export const updateTaskStatus = (taskId, status) =>
  API.put(`/task/update/${taskId}`, { status });
