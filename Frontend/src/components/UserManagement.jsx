import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const roleNames = { admin: 'Administrador', hr: 'Recursos Humanos', viewer: 'Consulta' };

function UserManagement({ session }) {
  const [users, setUsers] = useState([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('hr');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setMessage('');
    try {
      setUsers(await api.get('/api/admin/users'));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.post('/api/admin/users', { full_name: fullName, email, password, role });
      setFullName('');
      setEmail('');
      setPassword('');
      setMessage('Usuario creado. Comparte la contraseña inicial de forma segura y solicita que la cambie tras el primer acceso.');
      await loadUsers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, nextRole) => {
    setLoading(true);
    setMessage('');
    try {
      const updatedUser = await api.patch(`/api/admin/users/${userId}/role`, { role: nextRole });
      setUsers((previous) => previous.map((user) => user.id === updatedUser.id ? updatedUser : user));
    } catch (error) {
      setMessage(error.message);
      await loadUsers();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">Acceso y permisos</p>
          <h2>Administración de usuarios</h2>
        </div>
      </div>
      <form className="panel" onSubmit={handleCreateUser}>
        <h3>Crear usuario</h3>
        <div className="filters">
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombre completo" required maxLength="120" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Correo electrónico" required />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Contraseña inicial (mínimo 12 caracteres)" minLength="12" maxLength="200" required autoComplete="new-password" />
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="hr">Recursos Humanos</option>
            <option value="viewer">Consulta</option>
          </select>
        </div>
        <button className="primary-button" type="submit" disabled={loading}>Crear cuenta</button>
      </form>
      {message && <p className="notice">{message}</p>}
      <div className="panel">
        <h3>Usuarios registrados</h3>
        {loading && <p>Cargando...</p>}
        <div className="user-list">
          {users.map((user) => (
            <div className="user-row" key={user.id}>
              <div>
                <strong>{user.full_name || 'Sin nombre'}</strong>
                <small>{user.email}</small>
                <small>{user.id === session.user.id ? 'Tu cuenta' : `Registrado ${new Date(user.created_at).toLocaleDateString()}`}</small>
              </div>
              <label>
                Permiso
                <select value={user.role} onChange={(event) => handleRoleChange(user.id, event.target.value)} disabled={loading}>
                  {Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          ))}
          {!loading && users.length === 0 && <p className="empty-state">Todavía no hay usuarios registrados.</p>}
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
