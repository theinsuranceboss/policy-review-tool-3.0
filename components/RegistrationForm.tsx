
import React, { useState } from 'react';

interface RegistrationFormProps {
  onRegister: (name: string, email: string) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Boss, we need a real email address.");
      return;
    }

    setLoading(true);
    // Simulate short processing
    setTimeout(() => {
      onRegister(name, email);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center animate-in fade-in zoom-in-95 duration-700">
      <div className="mb-16 space-y-6">
        <h1 className="text-6xl md:text-[7rem] font-black leading-[0.8] tracking-tighter text-white uppercase">
          Verify Your <br />
          <span className="text-yellow-400">Authority</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-2xl font-bold max-w-2xl mx-auto leading-tight opacity-90">
          The Boss requires your details to unlock the high-security technical audit engine.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-8 bg-black/40 backdrop-blur-3xl p-10 md:p-16 rounded-[4rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
        <div className="space-y-6 text-left">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-500 tracking-[0.2em] ml-2 uppercase">Full Name</label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-lg font-bold focus:outline-none focus:border-yellow-400/50 transition-all text-white placeholder:text-gray-700 shadow-inner"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-500 tracking-[0.2em] ml-2 uppercase">Business Email</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-lg font-bold focus:outline-none focus:border-yellow-400/50 transition-all text-white placeholder:text-gray-700 shadow-inner"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 text-black font-black py-7 rounded-3xl hover:bg-yellow-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_rgba(250,204,21,0.2)] uppercase tracking-widest text-sm flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>Unlock Boss Audit Access</>
          )}
        </button>

        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          By continuing, you agree to receive an automated verification link.
        </p>
      </form>
    </div>
  );
};

export default RegistrationForm;
