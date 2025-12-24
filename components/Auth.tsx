
import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { TrendingUp, Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a0c] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-[#2ebd85] p-3 rounded-2xl shadow-xl shadow-[#2ebd85]/20 mb-4">
            <TrendingUp size={32} className="text-[#080a0c]" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            Nexora <span className="text-[#2ebd85]">Pro</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">Professional Financial Terminal</p>
        </div>

        <div className="bg-[#111418] border border-[#1c2127] rounded-[2.5rem] p-10 shadow-2xl">
          <h2 className="text-xl font-black text-white uppercase mb-8">
            {isLogin ? 'Welcome Back' : 'Join the Elite'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text" 
                    required
                    placeholder="E.g. John Doe"
                    className="w-full bg-[#080a0c] border border-[#1c2127] rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-[#2ebd85] transition-all placeholder:text-slate-700"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="email" 
                  required
                  placeholder="name@company.com"
                  className="w-full bg-[#080a0c] border border-[#1c2127] rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-[#2ebd85] transition-all placeholder:text-slate-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#080a0c] border border-[#1c2127] rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-[#2ebd85] transition-all placeholder:text-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-500 text-[11px] font-bold text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#2ebd85] hover:bg-[#2ebd85]/90 text-[#080a0c] font-black uppercase py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#2ebd85]/10 mt-4 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  {isLogin ? 'Enter Terminal' : 'Start Trading'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </div>

        <p className="text-center mt-10 text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] opacity-50">
          Powered by Nexora Cloud Infrastructure
        </p>
      </div>
    </div>
  );
};

export default Auth;
