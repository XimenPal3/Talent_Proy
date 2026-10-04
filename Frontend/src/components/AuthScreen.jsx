import { useState } from 'react';
import { api, setCsrfToken } from '../lib/api';

function AuthScreen({ onLogin, backendError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { csrfToken } = await api.get('/api/auth/session');
      setCsrfToken(csrfToken);
      const result = await api.post('/api/auth/login', { email, password });
      setCsrfToken(result.csrfToken);
      await onLogin(result.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>TalentFlow</h2>
        <p>Inicia sesión para administrar candidatos</p>
        <form onSubmit={handleAuth} className="auth-form">
          <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        {backendError && <p className="auth-message">{backendError}</p>}
      </div>
    </div>
  );
}

export default AuthScreen;
