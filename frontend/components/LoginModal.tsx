"use client";

import React, { useState } from 'react';
import { useAuth, User } from '../lib/AuthContext';
import { ShieldCheck, User as UserIcon, Lock, Key, X, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function LoginModal() {
  const { isLoginModalOpen, setIsLoginModalOpen, login, user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [parola, setParola] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await login(identifier, parola);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.message || 'Eroare la autentificare.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-sapphire-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-morning-200 p-6 rounded-3xl max-w-md w-full space-y-5 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-morning-200 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sapphire-500 flex items-center justify-center text-white shadow-md shadow-sapphire-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-sapphire-900">Autentificare în Sistem</h3>
              <p className="text-[11px] text-sage-600 font-semibold">FleetCMD Enterprise Security & Audit</p>
            </div>
          </div>
          {user && (
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="text-sage-400 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-roseash-100 border border-roseash-300 rounded-xl text-terracotta-700 text-xs font-bold flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-sage-700 block mb-1 font-bold">Nume Utilizator (Username):</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Introduceți utilizatorul (ex: admin, dispecer)"
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2.5 text-sapphire-900 font-bold focus:bg-white focus:border-sapphire-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sage-700 block mb-1 font-bold">Parolă Acces:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={parola}
                onChange={(e) => setParola(e.target.value)}
                placeholder="Introduceți parola"
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-9 py-2.5 text-sapphire-900 font-mono font-bold focus:bg-white focus:border-sapphire-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sapphire-900"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition flex items-center justify-center space-x-2"
          >
            <Key className="w-4 h-4" />
            <span>{loading ? 'Se verifică accesul...' : 'Conectare în Sistem'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
