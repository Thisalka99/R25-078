// import React, { useState } from 'react';
// import { registerUser } from '../api';
// import { useNavigate } from 'react-router-dom';

// export default function Register() {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate();

//   const handleRegister = async (e) => {
//     e.preventDefault();
//     try {
//       await registerUser({ username, password });
//       alert('Registered successfully');
//       navigate('/login');
//     } catch (err) {
//       alert(err.response.data.message);
//     }
//   };

//   return (
//     <form onSubmit={handleRegister}>
//       <h2>Register</h2>
//       <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
//       <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
//       <button type="submit">Register</button>
//     </form>
//   );
// }

import React, { useState } from 'react';
import { registerUser } from '../api';
import { useNavigate } from 'react-router-dom';
import './Register.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await registerUser({ username, password });
      alert('Registered successfully');
      navigate('/login');
    } catch (err) {
      alert(err.response.data.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleRegister} className="auth-form">
        <h2 className="auth-header">🔐 Register</h2>

        <input
          className="auth-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />

        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />

        <button type="submit" className="auth-button">Create Account</button>

        <p className="auth-footer">
          Already have an account? <span onClick={() => navigate('/login')}>Login</span>
        </p>
      </form>
    </div>
  );
}
