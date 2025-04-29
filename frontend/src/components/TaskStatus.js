// import React, { useEffect, useState } from 'react';
// import { getTasks, updateTaskStatus } from '../api';

// export default function TaskStatus() {
//   const [tasks, setTasks] = useState([]);

//   useEffect(() => {
//     const fetch = async () => {
//       const userId = localStorage.getItem('userId');
//       const res = await getTasks(userId);
//       setTasks(res.data);
//     };
//     fetch();
//   }, []);

//   const markDone = async (id) => {
//     await updateTaskStatus(id, 'completed');
//     alert('Task marked complete');
//     setTasks(tasks.map(t => t._id === id ? { ...t, status: 'completed' } : t));
//   };

//   return (
//     <div>
//       <h2>Update Tasks</h2>
//       {tasks.map(task => (
//         <div key={task._id}>
//           <p>{task.description} - {task.date} {task.time} - [{task.status}]</p>
//           {task.status === 'pending' && (
//             <button onClick={() => markDone(task._id)}>Mark Complete</button>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }
import React, { useEffect, useState } from 'react';
import { getTasks, updateTaskStatus } from '../api';
import './TaskStatus.css';

export default function TaskStatus() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const userId = localStorage.getItem('userId');
      const res = await getTasks(userId);
      setTasks(res.data);
    };
    fetch();
  }, []);

  const markDone = async (id) => {
    await updateTaskStatus(id, 'completed');
    alert('Task marked complete');
    setTasks(tasks.map(t => t._id === id ? { ...t, status: 'completed' } : t));
  };

  return (
    <div className="task-status-container">
      <h2 className="status-header">🛠️ Update Tasks</h2>

      {tasks.length === 0 ? (
        <p className="no-task">No tasks found.</p>
      ) : (
        tasks.map(task => (
          <div key={task._id} className="task-card">
            <p className="task-details">
              {task.description} — {task.date} {task.time} <span className={`task-badge ${task.status}`}>[{task.status}]</span>
            </p>

            {task.status === 'pending' && (
              <button className="status-button" onClick={() => markDone(task._id)}>
                Mark Complete
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
