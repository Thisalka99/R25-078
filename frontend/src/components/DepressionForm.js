// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';

// export default function DepressionForm() {
//   const [questions, setQuestions] = useState([]);
//   const [responses, setResponses] = useState({});
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchQuestions = async () => {
//       const res = await axios.get('http://localhost:5000/api/depression/questions');
//       setQuestions(res.data);
//     };
//     fetchQuestions();
//   }, []);

//   const handleChange = (questionId, value) => {
//     setResponses((prev) => ({
//       ...prev,
//       [questionId]: value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const userId = localStorage.getItem('userId');
//     const formattedResponses = Object.entries(responses).map(([questionId, answer]) => ({
//       questionId,
//       answer,
//     }));

//     try {
//       await axios.post('http://localhost:5000/api/depression/submit', {
//         userId,
//         responses: formattedResponses,
//       });
//       alert('Form submitted successfully!');
//       navigate('/dashboard');
//     } catch (err) {
//       console.error(err);
//       alert('Error submitting form');
//     }
//   };

//   return (
//     <div>
//       <h2>Depression Assessment Form</h2>
//       <form onSubmit={handleSubmit}>
//         {questions.map((q, index) => (
//           <div key={q._id}>
//             <p><strong>{index + 1}. {q.text}</strong></p>
//             <label>
//               <input
//                 type="radio"
//                 name={q._id}
//                 value="Yes"
//                 checked={responses[q._id] === 'Yes'}
//                 onChange={() => handleChange(q._id, 'Yes')}
//               /> Yes
//             </label>
//             <label style={{ marginLeft: '15px' }}>
//               <input
//                 type="radio"
//                 name={q._id}
//                 value="No"
//                 checked={responses[q._id] === 'No'}
//                 onChange={() => handleChange(q._id, 'No')}
//               /> No
//             </label>
//             <hr />
//           </div>
//         ))}

//         <button type="submit" disabled={Object.keys(responses).length !== questions.length}>
//           Submit Form
//         </button>
//       </form>
//     </div>
//   );
// }
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DepressionForm.css';

export default function DepressionForm() {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      const res = await axios.get('http://localhost:5000/api/depression/questions');
      setQuestions(res.data);
    };
    fetchQuestions();
  }, []);

  const handleChange = (questionId, value) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    const formattedResponses = Object.entries(responses).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      await axios.post('http://localhost:5000/api/depression/submit', {
        userId,
        responses: formattedResponses,
      });
      alert('Form submitted successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error submitting form');
    }
  };

  return (
    <div className="depression-form-container">
      <h2 className="form-title">🧠 Depression Assessment Form</h2>

      <form onSubmit={handleSubmit} className="depression-form">
        {questions.map((q, index) => (
          <div key={q._id} className="question-box">
            <p className="question-text"><strong>{index + 1}. {q.text}</strong></p>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name={q._id}
                  value="Yes"
                  checked={responses[q._id] === 'Yes'}
                  onChange={() => handleChange(q._id, 'Yes')}
                />
                Yes
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name={q._id}
                  value="No"
                  checked={responses[q._id] === 'No'}
                  onChange={() => handleChange(q._id, 'No')}
                />
                No
              </label>
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="submit-button"
          disabled={Object.keys(responses).length !== questions.length}
        >
           Submit Form
        </button>
      </form>
    </div>
  );
}
