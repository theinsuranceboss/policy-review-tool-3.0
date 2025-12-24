import React, { useState } from 'react';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple demo password - in production this would be real auth
    if (password === 'boss2024') {
      onLogin();
    } else {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-24 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black tracking-tighter uppercase">ADMIN LOGIN</h2>
        <p className="text-gray-500">Enter your credentials to manage policy reviews</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Admin Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-yellow-400 transition-colors"
          />
          <p className="text-[10px] text-gray-500 px-1">Demo Pass: boss2024</p>
        </div>

        {error && <p className="text-red-400 text-sm font-medium px-1">{error}</p>}

        <button 
          type="submit"
          className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl hover:bg-yellow-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Login to Dashboard
        </button>
      </form>

      <p className="text-center text-gray-500 text-sm">
        Protected area. Authorized users only.
      </p>
    </div>
  );
};

export default AdminLogin;
