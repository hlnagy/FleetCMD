"use client";

import React, { useState } from 'react';
import { useAuth, User } from '../lib/AuthContext';
import { ShieldCheck, User as UserIcon, Lock, Key, X, Check, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function LoginModal() {
  const { isLoginModalOpen, setIsLoginModalOpen, login, switchUser, user } = useAuth();
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

  const handleQuickSwitch = (quickUser: {
    id: string;
    nume: string;
    email: string;
    username: string;
    rol: 'ADMIN' | 'OPERATOR' | 'VIEWER';
    functie: string;
    telefon: string;
  }) => {
    switchUser(quickUser);
    setIsLoginModalOpen(false);
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
              <h3 className="font-black text-base text-sapphire-900">Autentificare & Schimbare Utilizator</h3>
              <p className="text-[11px] text-sage-600 font-semibold">FleetCMD Access & Audit Control</p>
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

        {/* Quick User Selector */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-extrabold text-sage-600 tracking-wider">
            Comutare Rapidă Utilizator Test / Rol:
          </p>
          <div className="grid grid-cols-3 gap-2 text-left">
            <button
              type="button"
              onClick={() =>
                handleQuickSwitch({
                  id: 'admin-quick-id',
                  nume: 'Administrator Principal',
                  email: 'admin@fleetcmd.ro',
                  username: 'admin',
                  rol: 'ADMIN',
                  functie: 'Administrator Sistem',
                  telefon: '0744111222',
                })
              }
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-start transition ${
                user?.rol === 'ADMIN'
                  ? 'border-sapphire-500 bg-sapphire-50 text-sapphire-900 ring-2 ring-sapphire-400/20'
                  : 'border-morning-200 bg-morning-50 hover:bg-morning-100 text-slate-700'
              }`}
            >
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sapphire-500 text-white mb-1">
                ADMIN
              </span>
              <span className="font-extrabold truncate w-full text-[11px]">Administrator</span>
              <span className="text-[9px] text-sage-500 font-normal">Full Access</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickSwitch({
                  id: 'operator-quick-id',
                  nume: 'Brașoveanu Virgil',
                  email: 'dispecer@fleetcmd.ro',
                  username: 'dispecer',
                  rol: 'OPERATOR',
                  functie: 'Șef Flotă & Atelier',
                  telefon: '0744333444',
                })
              }
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-start transition ${
                user?.rol === 'OPERATOR'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/20'
                  : 'border-morning-200 bg-morning-50 hover:bg-morning-100 text-slate-700'
              }`}
            >
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white mb-1">
                OPERATOR
              </span>
              <span className="font-extrabold truncate w-full text-[11px]">Brașoveanu V.</span>
              <span className="text-[9px] text-sage-500 font-normal">Fără Setări</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickSwitch({
                  id: 'viewer-quick-id',
                  nume: 'Inspector Audit / Vizitator',
                  email: 'vizitator@fleetcmd.ro',
                  username: 'vizitator',
                  rol: 'VIEWER',
                  functie: 'Vizitator / Numai Citire',
                  telefon: '0722000111',
                })
              }
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-start transition ${
                user?.rol === 'VIEWER'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/20'
                  : 'border-morning-200 bg-morning-50 hover:bg-morning-100 text-slate-700'
              }`}
            >
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white mb-1">
                VIEWER
              </span>
              <span className="font-extrabold truncate w-full text-[11px]">Vizitator</span>
              <span className="text-[9px] text-sage-500 font-normal">Doar Citire</span>
            </button>
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-morning-200"></div>
          <span className="flex-shrink mx-3 text-sage-400 text-[10px] font-bold uppercase tracking-wider">
            sau autentificare cu parolă
          </span>
          <div className="flex-grow border-t border-morning-200"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {errorMsg && (
            <div className="p-3 bg-roseash-100 border border-roseash-300 rounded-xl text-terracotta-700 text-xs font-bold flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-sage-700 block mb-1 font-bold">Email sau Nume Utilizator:</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@fleetcmd.ro sau admin"
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2.5 text-sapphire-900 font-bold focus:bg-white focus:border-sapphire-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sage-700 block mb-1 font-bold">Parolă:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={parola}
                onChange={(e) => setParola(e.target.value)}
                placeholder="••••••••"
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
            <span>{loading ? 'Se verifică...' : 'Conectare în Sistem'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
