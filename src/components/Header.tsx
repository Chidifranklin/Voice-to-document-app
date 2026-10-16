import React, { useState } from 'react';
import {
  Mic,
  FolderOpen,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  onOpenLibrary: () => void;
  onOpenSecurityTest: () => void;
  onOpenLiveVoice?: () => void;
  docCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLibrary,
  onOpenSecurityTest,
  onOpenLiveVoice,
  docCount,
}) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                VoiceDoc
              </span>
              <span className="rounded-md bg-indigo-100 dark:bg-indigo-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Voice-to-Document AI
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Gemini 3.8 Live Voice Conversation Button */}
          <button
            onClick={onOpenLiveVoice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:brightness-105 transition"
            title="Real-time Voice Conversation with gemini-3.8-live"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden xs:inline">Live Call</span>
          </button>

          <PWAInstallButton />

          {/* Test Security Rules Button */}
          <button
            onClick={onOpenSecurityTest}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
            title="Verify Firestore Security Rules"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Test Rules</span>
          </button>

          {/* Library Button */}
          <button
            onClick={onOpenLibrary}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="My Saved Documents"
          >
            <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden xs:inline">Docs</span>
            {docCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {docCount}
              </span>
            )}
          </button>

          <ThemeToggle />

          {/* User profile dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200 overflow-hidden border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title={user.email || 'User Account'}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user.displayName || 'VoiceDoc User'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenLibrary();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                    >
                      <FolderOpen className="w-4 h-4 text-indigo-500" />
                      Saved Documents ({docCount})
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSecurityTest();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Audit Firestore Security Rules
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
