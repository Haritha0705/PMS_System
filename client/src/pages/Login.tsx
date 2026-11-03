import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Please enter both username and password', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await login(username, password);
      showToast('Login successful', 'success');
      navigate('/');
    } catch (err: unknown) {
      let message = 'Login failed';

      if (err instanceof Error) {
        message = err.message;
        // Provide more specific guidance for common errors
        if (message.includes('Network error') || message.includes('Unable to reach server')) {
          message = 'Cannot connect to server. Please ensure the PMS server is running on port 4500.';
        } else if (message.includes('Invalid credentials')) {
          message = 'Invalid username or password';
        } else if (message.includes('timeout')) {
          message = 'Connection timeout. Server may be unresponsive.';
        }
      }

      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo" style={{ background: 'transparent', padding: 0 }}>
          <img src="/icon.png" alt="PMS Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
        </div>
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to PMS Application</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 12 }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
