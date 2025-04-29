// import React, { useState } from 'react';
// import { loginUser } from '../api';
// import { useNavigate } from 'react-router-dom';

// export default function Login() {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await loginUser({ username, password });
//       localStorage.setItem('userId', res.data.userId);
//       navigate('/dashboard');
//     } catch (err) {
//       alert(err.response.data.message);
//     }
//   };

//   return (
//     <form onSubmit={handleLogin}>
//       <h2>Login</h2>
//       <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
//       <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
//       <button type="submit">Login</button>
//     </form>
//   );
// }
import React, { useState } from 'react';
import { loginUser } from '../api';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser({ username, password });
      localStorage.setItem('userId', res.data.userId);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleLogin} className="auth-form">
        <h2 className="auth-header">🔓 Login</h2>

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

        <button type="submit" className="auth-button">Login</button>

        <p className="auth-footer">
          Don't have an account? <span onClick={() => navigate('/')}>Register</span>
        </p>
      </form>
    </div>
  );
}
