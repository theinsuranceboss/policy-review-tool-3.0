import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link } = ReactRouterDOM;

interface HeaderProps {
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  onOpenWizard: () => void;
  onGoHome: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, setIsAdmin, onOpenWizard, onGoHome }) => {
  const location = ReactRouterDOM.useLocation();
  const navigate = ReactRouterDOM.useNavigate();

  const handleLogout = () => {
    setIsAdmin(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-2xl border-b border-white/5 px-8 py-6 flex items-center justify-between">
      <div className="flex items-center gap-10">
        <div 
          onClick={onGoHome} 
          className="flex items-center gap-4 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 group-hover:scale-110 transition-transform bg-black/40 flex items-center justify-center p-2.5">
            <svg className="w-full h-full text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 2.18l7 3.89v5.93c0 4.62-3 8.94-7 10-4-1.06-7-5.38-7-10V8.07l7-3.89z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-black text-2xl tracking-tighter leading-none uppercase">The Insurance Boss</h1>
            </div>
            <p className="text-[10px] text-gray-500 font-black tracking-[0.4em] uppercase mt-1">Policy Review Authority</p>
          </div>
        </div>

        <button 
          onClick={onGoHome}
          className="hidden lg:flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 group"
        >
          <svg className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>
      </div>

      <nav className="flex items-center gap-8">
        {isAdmin ? (
          <div className="flex items-center gap-6">
             <Link to="/admin" className={`text-xs font-black uppercase tracking-widest transition-colors ${location.pathname === '/admin' ? 'text-yellow-400' : 'text-gray-500 hover:text-white'}`}>
              Admin Vault
            </Link>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-widest transition-all border border-red-500/10"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenWizard}
              className="hidden md:block px-8 py-3.5 rounded-2xl bg-yellow-400 text-black text-xs font-black uppercase tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_10px_20px_rgba(250,204,21,0.2)]"
            >
              Get A Quote
            </button>
            <Link to="/admin" className="px-6 py-3.5 rounded-2xl bg-black/40 text-gray-400 border border-white/10 text-xs font-black uppercase tracking-widest hover:text-white hover:border-white/20 transition-all">
              Staff Access
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;