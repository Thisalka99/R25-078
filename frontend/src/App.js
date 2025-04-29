import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TaskEntry from './components/TaskEntry';
import TaskStatus from './components/TaskStatus';
import DepressionForm from './components/DepressionForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/task-entry" element={<TaskEntry />} />
        <Route path="/task-status" element={<TaskStatus />} />
        <Route path="/depression-form" element={<DepressionForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
