"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FolderOpen,
  HardDriveDownload,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import {
  clearSavedBackupDirectory,
  downloadDailyBackupArchive,
  formatBackupBytes,
  getSavedBackupDirectoryHandle,
  isDirectoryPickerSupported,
  pickAndSaveBackupDirectory,
} from '@/lib/localBackupStorage';
import { showToast } from '@/lib/swal';

const SNOOZE_UNTIL_KEY = 'fleetcmd_backup_snooze_until';
const SKIP_DATE_KEY = 'fleetcmd_backup_skip_date';

interface DailyStatusResponse {
  todayDate: string;
  encryptionConfigured: boolean;
  isRunning: boolean;
  needsLocalDownload: boolean;
  todayBackup: {
    backupDate: string;
    triggerType: string;
    status: string;
    engine: string;
    encrypted: boolean;
    filename?: string;
    sizeBytes?: number;
    sha256?: string;
    tableCount?: number;
    recordCount?: number;
    errorMessage?: string | null;
    downloadedToLocalAt?: string | null;
    downloadedByName?: string | null;
    fileAvailable?: boolean;
  } | null;
}

export default function DailyBackupModal() {
  const { user, isAdmin, authFetch } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [statusData, setStatusData] = useState<DailyStatusResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFolderName, setSavedFolderName] = useState<string | null>(null);
  const [pickerSupported, setPickerSupported] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFolderSetting = useCallback(async () => {
    setPickerSupported(isDirectoryPickerSupported());
    if (!isDirectoryPickerSupported()) return;
    const handle = await getSavedBackupDirectoryHandle();
    setSavedFolderName(handle?.name || null);
  }, []);

  const isSnoozedOrSkippedForToday = useCallback((todayDate: string, isFailed: boolean): boolean => {
    if (typeof window === 'undefined') return false;
    if (isFailed) return false;
    try {
      const skipDate = localStorage.getItem(SKIP_DATE_KEY);
      if (skipDate === todayDate) return true;
      const snoozeUntil = Number(localStorage.getItem(SNOOZE_UNTIL_KEY) || '0');
      if (snoozeUntil > Date.now()) return true;
    } catch {
      // ignore storage errors
    }
    return false;
  }, []);

  const checkDailyBackupStatus = useCallback(async () => {
    if (!user || !isAdmin) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/backup/daily-status`);
      if (!res.ok) return;
      const data: DailyStatusResponse = await res.json();
      setStatusData(data);

      const isFailed = data.todayBackup?.status === 'FAILED';
      const shouldPrompt = (data.needsLocalDownload || isFailed) && !isSnoozedOrSkippedForToday(data.todayDate, isFailed);

      if (shouldPrompt) {
        setIsOpen(true);
      } else if (!data.needsLocalDownload && !isFailed) {
        setIsOpen(false);
      }

      if (data.isRunning) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(() => {
          void checkDailyBackupStatus();
        }, 2500);
      }
    } catch {
      // silent background check
    }
  }, [user, isAdmin, authFetch, isSnoozedOrSkippedForToday]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setIsOpen(false);
      return;
    }

    void loadFolderSetting();
    void checkDailyBackupStatus();

    const intervalId = setInterval(() => {
      void checkDailyBackupStatus();
    }, 30 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkDailyBackupStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [user, isAdmin, loadFolderSetting, checkDailyBackupStatus]);

  const handlePickFolder = async () => {
    try {
      const res = await pickAndSaveBackupDirectory();
      if (res) {
        setSavedFolderName(res.name);
        void showToast(`Folder selectat: ${res.name}`, 'success', 2500);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setErrorMsg(e?.message || 'Nu s-a putut selecta folderul local.');
      }
    }
  };

  const handleClearFolder = async () => {
    await clearSavedBackupDirectory();
    setSavedFolderName(null);
  };

  const handleDownloadToLocal = async () => {
    setDownloading(true);
    setErrorMsg(null);
    try {
      const result = await downloadDailyBackupArchive(
        authFetch,
        API_BASE_URL,
        statusData?.todayDate,
      );
      setIsOpen(false);
      const targetMsg =
        result.savedVia === 'directory'
          ? `Salvat în folderul "${result.directoryName}" (${result.filename})`
          : `Descărcat pe calculator (${result.filename})`;
      void showToast(targetMsg, 'success', 4500);
      await checkDailyBackupStatus();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Eroare la descărcarea copiei de siguranță.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRetryBackup = async () => {
    setRetrying(true);
    setErrorMsg(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/backup/daily-run`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Regenerarea backup-ului a eșuat.');
      }
      await checkDailyBackupStatus();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Nu s-a putut regenera backup-ul.');
    } finally {
      setRetrying(false);
    }
  };

  const handleSnooze = () => {
    try {
      localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + 2 * 60 * 60 * 1000));
    } catch {}
    setIsOpen(false);
  };

  const handleSkipToday = () => {
    try {
      if (statusData?.todayDate) {
        localStorage.setItem(SKIP_DATE_KEY, statusData.todayDate);
      }
    } catch {}
    setIsOpen(false);
  };

  if (!isOpen || !user || !isAdmin || !statusData) return null;

  const backup = statusData.todayBackup;
  const isFailed = backup?.status === 'FAILED';
  const isRunning = statusData.isRunning;

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 print:hidden">
      <div className="pleasant-card w-full max-w-lg rounded-3xl bg-white border border-morning-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-5 text-white flex items-start justify-between gap-4 ${
            isFailed
              ? 'bg-gradient-to-r from-rose-700 to-rose-900'
              : 'bg-gradient-to-r from-sapphire-900 to-slate-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              {isFailed ? (
                <ShieldAlert className="w-6 h-6 text-rose-200" />
              ) : (
                <HardDriveDownload className="w-6 h-6 text-emerald-300" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block">
                Protecție Zilnică Date • Admin
              </span>
              <h2 className="text-base font-black leading-tight">
                {isFailed
                  ? 'Atenție: Backup-ul de noapte a eșuat!'
                  : `Copia de Siguranță Zilnică (${statusData.todayDate})`}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSnooze}
            title="Închide temporar (amintește peste 2 ore)"
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-sapphire-900">
          {isRunning ? (
            <div className="p-4 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-sapphire-600 animate-spin shrink-0" />
              <div>
                <p className="font-extrabold text-sapphire-900">Se pregătește backup-ul zilnic pe server...</p>
                <p className="text-sage-700 mt-0.5">
                  Arhiva se generează în siguranță (snapshot consistent + fișiere). Fereastra se actualizează automat.
                </p>
              </div>
            </div>
          ) : isFailed ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center space-x-2 text-rose-800 font-extrabold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Backup-ul automat din {statusData.todayDate} a întâmpinat o eroare:</span>
              </div>
              <p className="font-mono text-[11px] text-rose-700 bg-white/80 p-2 rounded-lg border border-rose-200">
                {backup?.errorMessage || 'Eroare necunoscută pe server.'}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 font-extrabold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Backup-ul automat pe server este pregătit</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-[10px] font-mono font-bold text-emerald-800">
                  {formatBackupBytes(backup?.sizeBytes)}
                </span>
              </div>

              <p className="text-emerald-900 opacity-85 leading-relaxed">
                Pentru siguranță maximă (copie externă pe calculatorul administratorului), salvează copia de astăzi pe PC-ul tău.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="px-2.5 py-1.5 rounded-xl bg-white/80 border border-emerald-200">
                  <span className="text-sage-500 block text-[10px] font-bold">ACOPERIRE</span>
                  <span className="font-extrabold text-sapphire-900">
                    {backup?.tableCount ?? 37} tabele • {backup?.recordCount ?? 0} înreg.
                  </span>
                </div>
                <div className="px-2.5 py-1.5 rounded-xl bg-white/80 border border-emerald-200">
                  <span className="text-sage-500 block text-[10px] font-bold">MOTOR</span>
                  <span className="font-extrabold text-sapphire-900 font-mono truncate block">
                    {backup?.engine || 'snapshot'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Encryption status badge */}
          {statusData.encryptionConfigured ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2.5 text-[11px] text-slate-700">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Criptare AES-256-GCM activă:</strong> arhiva <code className="font-mono">.fleetbak</code> conține baza completă protejată cu cheia de pe server.
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2.5 text-[11px] text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Mod protecție fără cheie:</strong> parola utilizatorilor și tokenurile ANAF sunt mascate automat în fișierul <code className="font-mono">.zip</code>. Adaugă <code className="font-mono">BACKUP_ENCRYPTION_KEY</code> în <code className="font-mono">.env</code> pentru arhive complete criptate.
              </span>
            </div>
          )}

          {/* Optional dedicated local folder (Chrome / Edge) */}
          {pickerSupported && (
            <div className="p-3 rounded-xl bg-morning-100/70 border border-morning-200 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center space-x-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-sapphire-600 shrink-0" />
                <span className="truncate">
                  {savedFolderName ? (
                    <>
                      Folder local fix: <strong className="text-sapphire-900">{savedFolderName}</strong>
                    </>
                  ) : (
                    'Opțional: alege un folder fix pe PC (ex. D:\\Backup_FleetCMD)'
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-sapphire-50 border border-morning-300 font-bold text-sapphire-700 transition"
                >
                  {savedFolderName ? 'Schimbă' : 'Alege folder'}
                </button>
                {savedFolderName && (
                  <button
                    type="button"
                    onClick={handleClearFolder}
                    className="px-2 py-1 rounded-lg hover:bg-rose-50 text-rose-600 font-bold transition"
                  >
                    Resetează
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {isFailed ? (
              <button
                type="button"
                onClick={handleRetryBackup}
                disabled={retrying}
                className="flex-1 px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Se regenerează...' : 'Reîncearcă Generarea Backup-ului'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadToLocal}
                disabled={downloading || isRunning}
                className="flex-1 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Se salvează pe calculator...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {savedFolderName
                        ? `Salvează în "${savedFolderName}"`
                        : 'Salvează Backup pe Calculator'}
                    </span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSnooze}
              className="px-3.5 py-3 rounded-2xl bg-morning-100 hover:bg-morning-200 text-sapphire-700 font-bold text-xs border border-morning-200 transition flex items-center justify-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Peste 2 ore</span>
            </button>

            {!isFailed && (
              <button
                type="button"
                onClick={handleSkipToday}
                className="px-3.5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-sage-700 font-bold text-xs border border-morning-200 transition"
              >
                Sari azi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
