import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2, ServerOff, FileCheck2, Cpu } from 'lucide-react';
import { loginUser, signupUser } from '../../services/api';

interface AuthScreenProps {
  onAuthenticate: (email: string, token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticate }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide valid credentials.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signupUser(email, password);
        onAuthenticate(res.email, res.access_token);
      } else {
        const res = await loginUser(email, password);
        onAuthenticate(res.email, res.access_token);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    onAuthenticate('guest@piishield.local', 'mock-jwt-token-guest-sandbox');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full bg-white rounded-2xl shadow-glass overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px] border border-slate-200">
        
        {/* Left Side — Deep Navy Branding & Trust Panel (5 cols) */}
        <div className="md:col-span-5 bg-navy-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Glow Decorative Pattern */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div>
            {/* Header */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-xl tracking-tight text-white">PII SHIELD</h1>
                <p className="text-xs text-emerald-400 font-medium tracking-wide">ZERO RETENTION PLATFORM</p>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-4">
              Enterprise Document Sanitization, Built Local-First.
            </h2>
            <p className="text-sm text-slate-300 mb-8 leading-relaxed">
              Scrub sensitive PII from PDFs, Office docs, and images with layout-preserving physical stream redaction.
            </p>

            {/* 3 Key Trust Promises */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3 bg-navy-800/80 p-3.5 rounded-xl border border-navy-700">
                <ServerOff className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Zero Server Retention</h4>
                  <p className="text-[11px] text-slate-400">In-memory byte processing only. No files ever written to disk or cloud.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-navy-800/80 p-3.5 rounded-xl border border-navy-700">
                <FileCheck2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">True Layout-Preserved Redaction</h4>
                  <p className="text-[11px] text-slate-400">Purges underlying character glyphs & text streams permanently.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-navy-800/80 p-3.5 rounded-xl border border-navy-700">
                <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Local-First Processing</h4>
                  <p className="text-[11px] text-slate-400">Powered by local Presidio, OpenCV, PyMuPDF with zero external LLM dependencies.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-navy-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>PII Shield v1.0.0</span>
            <span className="text-emerald-400 font-medium">100% Privacy Compliant</span>
          </div>
        </div>

        {/* Right Side — Form Panel (7 cols) */}
        <div className="md:col-span-7 bg-white p-8 sm:p-12 flex flex-col justify-between">
          <div>
            {/* Tab Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-8">
              <div>
                <h3 className="text-xl font-bold text-navy-900">
                  {isSignUp ? 'Create Workspace Account' : 'Welcome Back'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isSignUp ? 'Setup secure credentials for document audit workspace' : 'Sign in to access your secure sanitization studio'}
                </p>
              </div>

              <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200">
                <button
                  onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    !isSignUp ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    isSignUp ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="security.officer@enterprise.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-navy-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-navy-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-slate-600">Remember this device</span>
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Password reset request sent to admin."); }} className="text-indigo-600 font-semibold hover:underline">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create Workspace Account' : 'Sign In to Secure Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Access Sandbox Mode Button */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-3">Want to evaluate without credentials?</p>
            <button
              type="button"
              onClick={handleGuestMode}
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Continue in Guest Sandbox Mode</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
