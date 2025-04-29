// import React, { useState } from 'react';
// import { addTask } from '../api';
// import { useNavigate } from 'react-router-dom';

// export default function TaskEntry() {
//   const [description, setDescription] = useState('');
//   const [date, setDate] = useState('');
//   const [time, setTime] = useState('');
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const userId = localStorage.getItem('userId');
//     await addTask({ userId, description, date, time, status: 'pending' });
//     alert('Task added');
//     navigate('/dashboard');
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <h2>Enter Task</h2>
//       <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Task Description" required />
//       <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
//       <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
//       <button type="submit">Add Task</button>
//     </form>
//   );
// }
import React, { useState } from 'react';
import { addTask } from '../api';
import { useNavigate } from 'react-router-dom';
import './TaskEntry.css';

export default function TaskEntry() {
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    await addTask({ userId, description, date, time, status: 'pending' });
    alert('Task added');
    navigate('/dashboard');
  };

  return (
    <div className="task-entry-container">
      <form onSubmit={handleSubmit} className="task-form">
        <h2 className="form-header">📋 Enter Daily Task</h2>

        <input
          type="text"
          className="form-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Task Description"
          required
        />

        <input
          type="date"
          className="form-input"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />

        <input
          type="time"
          className="form-input"
          value={time}
          onChange={e => setTime(e.target.value)}
          required
        />

        <button type="submit" className="form-button">➕ Add Task</button>
      </form>
    </div>
  );
}
