import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@sms.com');
  const [password, setPassword] = useState('Admin@123');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-glow">S</div>
          <h1 className="text-2xl font-bold text-white">Sales Management</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-5 pt-4 border-t border-surface-border">
            <p className="text-xs text-gray-500 mb-2">Demo accounts:</p>
            <div className="space-y-1">
              {[['admin@sms.com','Admin@123','Admin'],['cashier@sms.com','Pass@123','Cashier'],['inventory@sms.com','Pass@123','Inv. Manager'],['supervisor@sms.com','Pass@123','Supervisor']].map(([e,p,role]) => (
                <button key={e} type="button" onClick={() => { setEmail(e); setPassword(p); }} className="w-full text-left text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-surface-2 transition-colors">
                  <span className="text-brand-400">{role}</span> — {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
