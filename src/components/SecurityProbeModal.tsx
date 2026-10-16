import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, X, Play, Lock, CheckCircle2 } from 'lucide-react';
import { testUnauthorizedAccess } from '../services/documentRepository.ts';

interface SecurityProbeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityProbeModal: React.FC<SecurityProbeModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    tested: boolean;
    blocked: boolean;
    statusText: string;
    path: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleRunTest = async () => {
    setIsRunning(true);
    const targetUserId = 'attacker_or_foreign_uid_9999';
    try {
      const res = await testUnauthorizedAccess(targetUserId);
      setResult({
        tested: true,
        blocked: res.blocked,
        statusText: res.statusText,
        path: `users/${targetUserId}/documents/forbidden_doc`,
      });
    } catch (err: any) {
      setResult({
        tested: true,
        blocked: true,
        statusText: `Blocked: ${err.message || 'Permission Denied'}`,
        path: `users/${targetUserId}/documents/forbidden_doc`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Firestore Security Rules Audit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify that reading other users' documents is strictly blocked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanation */}
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            Security Rule Architecture:
          </p>
          <pre className="p-2 rounded-lg bg-slate-200/70 dark:bg-slate-900 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 overflow-x-auto">
{`match /users/{userId}/documents/{documentId} {
  allow get, list, create, update, delete: 
    if request.auth != null && request.auth.uid == userId;
}`}
          </pre>
          <p>
            When tested, the app attempts to read another user&apos;s path directly from the client.
            Firestore rules should reject this request with <code>PERMISSION_DENIED</code>.
          </p>
        </div>

        {/* Test Result Box */}
        {result && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
              result.blocked
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {result.blocked ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Test PASSED: Zero-Trust Isolation Confirmed</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>Test FAILED</span>
                </>
              )}
            </div>

            <div className="space-y-1 font-mono text-[11px] opacity-90">
              <p>Target Path: {result.path}</p>
              <p>Verdict: {result.statusText}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex gap-3">
          <button
            onClick={handleRunTest}
            disabled={isRunning}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Testing Security Rules...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Unauthorized Read Test</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
