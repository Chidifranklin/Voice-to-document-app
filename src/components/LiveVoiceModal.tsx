import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Bot,
  User,
  Send,
  FileText,
  Volume2,
  AlertTriangle,
  X,
  Radio,
} from 'lucide-react';
import { useLiveVoiceConversation } from '../hooks/useLiveVoiceConversation.ts';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportToDocument: (transcript: string) => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onExportToDocument,
}) => {
  const live = useLiveVoiceConversation();
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [live.turns, live.currentTurn]);

  // Clean up on modal close
  useEffect(() => {
    if (!isOpen && live.isConnected) {
      live.stopLiveConversation();
    }
  }, [isOpen, live]);

  if (!isOpen) return null;

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    live.sendTextMessage(inputText.trim());
    setInputText('');
  };

  const handleExport = () => {
    const transcript = live.exportToVoiceDocTranscript();
    live.stopLiveConversation();
    onClose();
    if (transcript.trim()) {
      onExportToDocument(transcript);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Live Voice Conversation
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time, two-way conversational voice with Live API
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              live.stopLiveConversation();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Orb & Visualizer */}
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/80 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shrink-0">
          {/* Animated AI Voice Avatar Orb */}
          <div className="relative flex items-center justify-center my-2">
            {live.isSpeaking && (
              <>
                <div className="absolute h-36 w-36 rounded-full bg-violet-500/20 dark:bg-violet-500/30 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="absolute h-28 w-28 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 animate-pulse" />
              </>
            )}

            {live.isMicActive && !live.isSpeaking && (
              <div className="absolute h-28 w-28 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 animate-pulse" />
            )}

            <div
              className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 ${
                live.isSpeaking
                  ? 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 shadow-indigo-500/50 scale-105'
                  : live.isConnected
                  ? 'bg-gradient-to-tr from-indigo-600 to-emerald-500 shadow-emerald-500/30'
                  : 'bg-slate-700'
              }`}
            >
              {live.isSpeaking ? (
                <Volume2 className="w-9 h-9 animate-bounce" />
              ) : live.isConnected ? (
                <Mic className="w-9 h-9 animate-pulse" />
              ) : (
                <Sparkles className="w-8 h-8 opacity-70" />
              )}
            </div>
          </div>

          {/* Status Label */}
          <div className="mt-3 space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border border-slate-200/60 dark:border-slate-700/60">
              {live.isConnecting ? (
                <>
                  <div className="h-2 w-2 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  <span>Connecting to Gemini Live...</span>
                </>
              ) : live.isSpeaking ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-violet-600 dark:text-violet-400 font-bold">Gemini is Speaking (24kHz Audio)</span>
                </>
              ) : live.isConnected ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Live • Listening to Microphone</span>
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3 text-slate-400" />
                  <span>Call Inactive</span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {live.isConnected
                ? 'Speak naturally — Gemini listens and responds with low latency audio.'
                : 'Tap "Start Live Call" to begin voice conversation.'}
            </p>
          </div>

          {/* Error Banner */}
          {live.error && (
            <div className="mt-3 max-w-md flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <p className="flex-1">{live.error}</p>
            </div>
          )}
        </div>

        {/* Conversation History Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[160px] max-h-[300px]">
          {live.turns.length === 0 && !live.currentTurn ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 space-y-1">
              <Bot className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs font-semibold">No speech turns yet</p>
              <p className="text-[11px]">
                Say &ldquo;Hello Gemini, let&apos;s brainstorm ideas for my meeting notes&rdquo; to start.
              </p>
            </div>
          ) : (
            <>
              {live.turns.map((turn) => {
                const isGemini = turn.sender === 'gemini';
                return (
                  <div
                    key={turn.id}
                    className={`flex items-start gap-2.5 ${isGemini ? 'justify-start' : 'justify-end'}`}
                  >
                    {isGemini && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                        isGemini
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm'
                          : 'bg-indigo-600 text-white rounded-tr-sm'
                      }`}
                    >
                      <p>{turn.text}</p>
                      <span className={`block text-[9px] mt-1 ${isGemini ? 'text-slate-400' : 'text-indigo-200'}`}>
                        {turn.timestamp}
                      </span>
                    </div>

                    {!isGemini && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Streaming model output */}
              {live.currentTurn && (
                <div className="flex items-start gap-2.5 justify-start animate-in fade-in">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 dark:text-white border border-indigo-200 dark:border-indigo-900">
                    <p>{live.currentTurn}</p>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse mt-1" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Text Input Row for typing along with voice */}
        {live.isConnected && (
          <form onSubmit={handleSendText} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Or type a message to Gemini Live..."
              className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition"
              title="Send text"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Control Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!live.isConnected ? (
              <button
                onClick={live.startLiveConversation}
                disabled={live.isConnecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs sm:text-sm hover:brightness-105 shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
                <span>{live.isConnecting ? 'Connecting...' : 'Start Live Call'}</span>
              </button>
            ) : (
              <button
                onClick={live.stopLiveConversation}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs sm:text-sm hover:bg-rose-700 shadow-md shadow-rose-600/25 transition"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            )}

            {live.turns.length > 0 && (
              <button
                onClick={live.clearConversation}
                className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                Clear History
              </button>
            )}
          </div>

          {/* Turn into Document Button */}
          {live.turns.length > 0 && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
              title="Convert this conversation into structured notes"
            >
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Convert to Notes Document</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
