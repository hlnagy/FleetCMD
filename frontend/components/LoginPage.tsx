"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Truck,
  Wrench,
  Activity,
  ChevronRight,
  Shield,
  Cpu,
  Radio,
  FileCheck2,
  Zap,
  AlertCircle
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [parola, setParola] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const handleLogin = async (idToUse?: string, passToUse?: string) => {
    const finalId = (idToUse || identifier).trim();
    const finalPass = passToUse || parola;

    if (!finalId || !finalPass) {
      setErrorMsg('Vă rugăm să introduceți utilizatorul și parola.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(finalId, finalPass);
      if (!res.success) {
        setErrorMsg(res.message || 'Credențiale incorecte. Vă rugăm să reîncercați.');
      }
    } catch (err) {
      setErrorMsg('Eroare de conexiune la serverul de autentificare.');
    } finally {
      setLoading(false);
      setActiveDemo(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const handleQuickDemo = (username: string, pass: string, demoKey: string) => {
    setActiveDemo(demoKey);
    setIdentifier(username);
    setParola(pass);
    setErrorMsg('');
    handleLogin(username, pass);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-hidden select-none">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Radiant Glowing Ambient Lights */}
      <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-sapphire-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: ENTERPRISE SHOWCASE & BRAND IDENTITY */}
        <div className="lg:col-span-7 space-y-8 text-left">
          {/* Top Status Badge */}
          <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-400">
              Sistem Operațional • Telemetrie Activă 24/7
            </span>
          </div>

          {/* Logo & Headline */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sapphire-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-sapphire-500/30 ring-1 ring-white/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center space-x-2">
                  <span>Fleet</span>
                  <span className="bg-gradient-to-r from-cyan-400 via-sapphire-300 to-indigo-400 bg-clip-text text-transparent">
                    CMD
                  </span>
                </h1>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  Enterprise FMS & CMMS Platform
                </p>
              </div>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Control total & mentenanță inteligentă pentru <span className="bg-gradient-to-r from-cyan-400 to-sapphire-300 bg-clip-text text-transparent">flote grele</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Platformă unificată pentru monitorizarea vehiculelor grele, devize automate de service, managementul axelor și anvelopelor, gestiunea magaziilor de piese și sincronizare securizată e-Factura ANAF.
            </p>
          </div>

          {/* Core Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-extrabold text-white">Telemetrie & Contor</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Ore funcționare (MTH) și kilometri, alerte automate depășire intervale și revizii.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-extrabold text-white">Atelier CMMS & Devize</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Comenzi de lucru, alocare mecanici, descărcare automată piese din depozit.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-extrabold text-white">Securitate & Audit RBAC</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Niveluri stricte de acces (Admin, Operator, Viewer) cu trasabilitate completă a acțiunilor.
              </p>
            </div>
          </div>

          {/* System Metrics Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 border-t border-slate-800/80">
            <div className="flex items-center space-x-2">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Latență API: <strong className="text-slate-200">14ms</strong></span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Disponibilitate Sistem: <strong className="text-slate-200">99.98%</strong></span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Criptare: <strong className="text-slate-200">AES-256 GCM</strong></span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH-TECH COMMAND LOGIN CONSOLE */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl bg-slate-900/80 border border-slate-700/70 p-7 sm:p-9 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
            {/* Ambient Card Top Glow */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            {/* Console Header */}
            <div className="mb-6 text-left space-y-1">
              <div className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Consolă de Autentificare</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Acces Securizat
              </h3>
              <p className="text-xs text-slate-400">
                Introduceți datele contului de utilizator pentru a continua
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-950/40 border border-rose-500/50 rounded-2xl text-rose-300 text-xs font-bold flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Nume Utilizator (Username)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ex: admin, dispecer, vizitator"
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">
                    Parolă de Acces
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={parola}
                    onChange={(e) => setParola(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    title={showPassword ? 'Ascunde parola' : 'Afișează parola'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-sapphire-600 via-indigo-600 to-cyan-600 hover:from-sapphire-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {loading && !activeDemo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Se validează accesul...</span>
                  </>
                ) : (
                  <>
                    <span>Accesează Panoul de Control</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Section (1-Click Roles for Evaluators) */}
            <div className="mt-6 pt-5 border-t border-slate-800 space-y-2.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 text-center font-bold">
                Conectare Rapidă Demo (Alege Rolul)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                {/* Admin Demo Button */}
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin', 'admin123', 'admin')}
                  disabled={loading}
                  className={`p-2.5 rounded-xl border transition text-left space-y-0.5 group cursor-pointer ${
                    activeDemo === 'admin'
                      ? 'bg-sapphire-600/30 border-sapphire-400 ring-1 ring-sapphire-400/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-sapphire-500/60 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-white group-hover:text-cyan-300">Admin</span>
                    <Shield className="w-3.5 h-3.5 text-sapphire-400" />
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">Acces Total & Setări</p>
                </button>

                {/* Operator Demo Button */}
                <button
                  type="button"
                  onClick={() => handleQuickDemo('dispecer', 'operator123', 'operator')}
                  disabled={loading}
                  className={`p-2.5 rounded-xl border transition text-left space-y-0.5 group cursor-pointer ${
                    activeDemo === 'operator'
                      ? 'bg-emerald-600/30 border-emerald-400 ring-1 ring-emerald-400/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-white group-hover:text-emerald-300">Operator</span>
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">Flotă, Atelier, Stoc</p>
                </button>

                {/* Viewer Demo Button */}
                <button
                  type="button"
                  onClick={() => handleQuickDemo('vizitator', 'viewer123', 'viewer')}
                  disabled={loading}
                  className={`p-2.5 rounded-xl border transition text-left space-y-0.5 group cursor-pointer ${
                    activeDemo === 'viewer'
                      ? 'bg-amber-600/30 border-amber-400 ring-1 ring-amber-400/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-white group-hover:text-amber-300">Vizitator</span>
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">Doar Citire & Audit</p>
                </button>
              </div>
            </div>

            {/* Footer Assurance */}
            <div className="mt-5 pt-3 border-t border-slate-800/60 text-center">
              <p className="text-[10px] text-slate-500 font-medium">
                FleetCMD v2.4 • Conexiune securizată TLS 1.3 • Protocol Audit ISO 27001
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
