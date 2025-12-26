
import React, { useState } from 'react';

// Removed redundant 'declare global' block that conflicted with environment-provided types.
// We access aistudio properties via type casting to ensure compatibility with built-in global types.

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
      setError('Invalid Admin Credentials.');
    }
  };

  const handleActivateKey = async () => {
    // Accessing aistudio safely through type casting to satisfy global type requirements.
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      await aistudio.openSelectKey();
    } else {
      alert("Activation dialog only available in AI Studio environment.");
    }
  };

  return (
    <div className="max-w-md mx-auto py-24 space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
      <div className="space-y-2">
        <h2 className="text-4xl font-black tracking-tighter">Admin Login</h2>
        <p className="text-gray-500">Enter Your Credentials To Manage Policy Reviews</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-[#1a1a1a]/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 space-y-6 text-left shadow-2xl">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 tracking-widest px-1">Admin Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-yellow-400 transition-all text-white"
          />
          <div className="flex justify-between items-center px-1 mt-1">
            <p className="text-[10px] text-gray-600">Demo Pass: boss2024</p>
            <button 
              type="button"
              onClick={handleActivateKey}
              className="text-[10px] text-yellow-400/50 hover:text-yellow-400 font-bold tracking-widest uppercase transition-colors"
            >
              Activate Boss AI
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm font-medium px-1">{error}</p>}

        <button 
          type="submit"
          className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl hover:bg-yellow-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-400/10"
        >
          Login To Dashboard
        </button>
      </form>

      <div className="space-y-4">
        <p className="text-center text-gray-500 text-sm">
          Protected Area. Authorized Users Only.
        </p>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[10px] text-yellow-400/40 hover:text-yellow-400 transition-colors uppercase font-black tracking-widest"
        >
          API Billing Documentation
        </a>
      </div>
    </div>
  );
};

export default AdminLogin;
