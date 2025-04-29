// import React, { useEffect, useState } from 'react';
// import { getTasks } from '../api';
// import { useNavigate } from 'react-router-dom';

// export default function Dashboard() {
//   const [tasks, setTasks] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetch = async () => {
//       const userId = localStorage.getItem('userId');
//       const res = await getTasks(userId);
//       setTasks(res.data);
//     };
//     fetch();
//   }, []);

//   const completed = tasks.filter(t => t.status === 'completed');
//   const pending = tasks.filter(t => t.status !== 'completed');
//   const total = tasks.length;

//   const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;
//   const isGood = percentage >= 75;

//   return (
//     <div>
//       <h2>Dashboard</h2>
//       <button onClick={() => navigate('/task-entry')}>Enter Daily Task</button>
//       <button onClick={() => navigate('/task-status')}>Update Task Status</button>

//       <h3> Completed Tasks: {completed.length}</h3>
//       <h3> Pending Tasks: {pending.length}</h3>

//       <h3> Progress: {percentage}%</h3>
//       <p style={{ color: isGood ? 'green' : 'red' }}>
//         {isGood ? 'Good: current progress is good.' : 'Bad: current progress is bad.'}
//       </p>

//       {!isGood && (
//         <button onClick={() => navigate('/depression-form')}>
//           Enter Depression Form
//         </button>
//       )}
//     </div>
//   );
// }












//new dashboard




// import React, { useEffect, useState } from 'react';
// import { getTasks } from '../api';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import './Dashboard.css';


// export default function Dashboard() {
//   const [tasks, setTasks] = useState([]);
//   const [prediction, setPrediction] = useState(null);
//   const navigate = useNavigate();
//   const userId = localStorage.getItem('userId');

//   useEffect(() => {
//     const fetchTasksAndPredict = async () => {
//       const res = await getTasks(userId);
//       setTasks(res.data);

//       const completed = res.data.filter(t => t.status === 'completed');
//       const pending = res.data.filter(t => t.status !== 'completed');
//       const total = res.data.length;

//       const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;
//       const isGood = percentage >= 75;

    
//       try {
//         const answers = (await axios.get(`http://localhost:5000/api/depression/latest?userId=${userId}`)).data;

        
//         const payload = {
//           Task_Completed: percentage >= 50 ? 1 : 0,
//           Task_Difficulty: 2, 
//           Time_Taken: 2.5,    
//           Emotion_Feedback: isGood ? 1 : 0,
//           Performance_Score: percentage,
//           ...answers
//         };

//         const result = await axios.post('http://127.0.0.1:5000/predict', payload);
//         setPrediction(result.data);
//       } catch (err) {
//         console.log('No depression form filled or model error');
//       }
//     };

//     fetchTasksAndPredict();
//   }, [userId]);

//   const completed = tasks.filter(t => t.status === 'completed');
//   const pending = tasks.filter(t => t.status !== 'completed');
//   const total = tasks.length;
//   const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;
//   const isGood = percentage >= 75;

//   return (





//     <div>
//       <h2>Dashboard</h2>
//       <button onClick={() => navigate('/task-entry')}>Enter Daily Task</button>
//       <button onClick={() => navigate('/task-status')}>Update Task Status</button>

//       <h3> Completed Tasks: {completed.length}</h3>
//       <h3> Pending Tasks: {pending.length}</h3>
//       <h3> Progress: {percentage}%</h3>

//       <p style={{ color: isGood ? 'green' : 'red' }}>
//         {isGood ? 'Good: current progress is good.' : 'Bad: current progress is bad.'}
//       </p>

//       {!isGood && (
//         <button onClick={() => navigate('/depression-form')}>
//           Enter Depression Form
//         </button>
//       )}

// {prediction && (
//   <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #aaa' }}>
//     <h3> Depression Prediction</h3>
//     <p><strong>Depression Level:</strong> {prediction.result}</p>

//     {prediction.probability ? (
//       <>
//         <p><strong>Probability:</strong></p>
//         <ul>
//           {Object.entries(prediction.probability).map(([label, value]) => (
//             <li key={label}>Class {label}: {value.toFixed(2)}</li>
//           ))}
//         </ul>
//       </>
//     ) : (
//       <p style={{ color: 'gray' }}>No probability data available.</p>
//     )}
//   </div>
// )}

//     </div>
//   );
// }
import React, { useEffect, useState } from 'react';
import { getTasks } from '../api';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchTasksAndPredict = async () => {
      const res = await getTasks(userId);
      setTasks(res.data);

      const completed = res.data.filter(t => t.status === 'completed');
      const total = res.data.length;
      const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;
      const isGood = percentage >= 75;

      try {
        const answers = (await axios.get(`http://localhost:5000/api/depression/latest?userId=${userId}`)).data;

        const payload = {
          Task_Completed: percentage >= 50 ? 1 : 0,
          Task_Difficulty: 2,
          Time_Taken: 2.5,
          Emotion_Feedback: isGood ? 1 : 0,
          Performance_Score: percentage,
          ...answers
        };

        const result = await axios.post('http://127.0.0.1:5000/predict', payload);
        setPrediction(result.data);
      } catch (err) {
        console.log('No depression form filled or model error');
      }
    };

    fetchTasksAndPredict();
  }, [userId]);

  const completed = tasks.filter(t => t.status === 'completed');
  const pending = tasks.filter(t => t.status !== 'completed');
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const isGood = percentage >= 75;

  return (
    <div className="dashboard-container">
      <h2 className="header">Dashboard</h2>

      <div className="button-group">
        <button onClick={() => navigate('/task-entry')}>Enter Daily Task</button>
        <button onClick={() => navigate('/task-status')}>Update Task Status</button>
      </div>

      <div className="card">
        <h3> Completed Tasks: {completed.length}</h3>
        <h3> Pending Tasks: {pending.length}</h3>
        <h3> Progress: {percentage}%</h3>

        <p className={`status-text ${isGood ? 'good' : 'bad'}`}>
          {isGood ? 'Good: current progress is good.' : 'Bad: current progress is bad.'}
        </p>

        {!isGood && (
          <button className="depression-button" onClick={() => navigate('/depression-form')}>
            Enter Depression Form
          </button>
        )}
      </div>

      {prediction && (
        <div className="depression-box">
          <h3> Depression Prediction</h3>
          <p><strong>Depression Level:</strong> {prediction.result}</p>

          {prediction.probability ? (
            <>
              <p><strong>Probability:</strong></p>
              <ul>
                {Object.entries(prediction.probability).map(([label, value]) => (
                  <li key={label}>Class {label}: {value.toFixed(2)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ color: 'gray' }}>No probability data available.</p>
          )}
        </div>
      )}
    </div>
  );
}
