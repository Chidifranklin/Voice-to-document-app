import React, { useRef, useState } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Radio,
  FileAudio,
  ArrowRight,
  Volume2,
  Lock,
  FileText,
  RotateCcw,
  Cpu,
  Play,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';
import { UseSpeechRecognitionReturn } from '../hooks/useSpeechRecognition.ts';
import { DocumentTemplate, TEMPLATES } from '../types/document.ts';

interface RecordScreenProps {
  speech: UseSpeechRecognitionReturn;
  onProceedToEdit: () => void;
  onQuickGenerate?: (template: DocumentTemplate) => void;
  onOpenLiveVoice?: () => void;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({
  speech,
  onProceedToEdit,
  onQuickGenerate,
  onOpenLiveVoice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedQuickTemplate, setSelectedQuickTemplate] = useState<DocumentTemplate>('Meeting Notes');

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await speech.transcribeAudioFileWithAI(file);
    } catch {
      // Handled in hook
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasAnyTranscript = speech.transcript.trim().length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Intro banner */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 mb-1 border border-indigo-200/60 dark:border-indigo-800/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Speech to Document with gemini-3.5-transcribe</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Voice to Text Document
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Record speech with your microphone to transcribe into text, then structure it into a Word document with AI.
        </p>
      </div>

      {/* Transcription Engine Toggle */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 flex gap-1 shadow-xs">
        <button
          type="button"
          onClick={() => speech.setTranscriptionMode('gemini-3.5-transcribe')}
          disabled={speech.isRecording}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            speech.transcriptionMode === 'gemini-3.5-transcribe'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Gemini 3.5 Transcribe</span>
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-white/20 text-white font-mono">
            AI Audio
          </span>
        </button>

        <button
          type="button"
          onClick={() => speech.setTranscriptionMode('web-speech')}
          disabled={speech.isRecording}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            speech.transcriptionMode === 'web-speech'
              ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Web Speech API</span>
        </button>
      </div>

      {/* Gemini 3.8 Live Voice Conversation Banner */}
      {onOpenLiveVoice && !speech.isRecording && (
        <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-purple-600/10 dark:from-violet-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-violet-200 dark:border-violet-800/60 p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Real-Time Voice Conversation</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-semibold">
                  gemini-3.8-live
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Have a live spoken discussion with Gemini, brainstorm ideas, and turn it into notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLiveVoice}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-105 text-white font-bold text-xs shadow-xs transition"
          >
            <span>Live Call</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Permission Denied Recovery Card */}
      {speech.isPermissionDenied && (
        <div className="rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-5 space-y-3.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-sm">Microphone Access Needed</p>
              <p className="text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                Your browser or iframe blocked microphone access. To enable recording:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 pt-0.5">
                <li>Click the <strong>Lock</strong> or <strong>Tune</strong> icon in your browser address bar.</li>
                <li>Set <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                <li>Tap <strong>Try Microphone Again</strong> below or refresh the page.</li>
              </ol>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/60 flex flex-wrap items-center gap-2">
            <button
              onClick={speech.startRecording}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Microphone Again</span>
            </button>

            <button
              onClick={() => {
                speech.loadSampleTranscript('meeting');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold border border-amber-300 dark:border-amber-800 hover:bg-amber-100/50 dark:hover:bg-slate-800 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Load Sample Meeting Note</span>
            </button>

            <button
              onClick={onProceedToEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold border border-amber-300 dark:border-amber-800 hover:bg-amber-100/50 dark:hover:bg-slate-800 transition"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Type / Paste Note</span>
            </button>
          </div>
        </div>
      )}

      {/* General Error alert if any */}
      {speech.error && !speech.isPermissionDenied && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p className="mt-0.5">{speech.error}</p>
          </div>
          <button
            onClick={speech.clearError}
            className="text-rose-700 dark:text-rose-300 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Record Button & Visualizer Area */}
      <div className="flex flex-col items-center justify-center py-4 sm:py-6">
        {/* Pulsing ring animation container */}
        <div className="relative flex items-center justify-center">
          {speech.isRecording && (
            <>
              <div
                className="absolute h-44 w-44 rounded-full bg-rose-500/20 dark:bg-rose-500/30 animate-ping"
                style={{ animationDuration: '2s' }}
              />
              <div
                className="absolute h-36 w-36 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 animate-pulse"
              />
            </>
          )}

          {/* Big Record Button */}
          <button
            type="button"
            onClick={speech.isRecording ? speech.stopRecording : speech.startRecording}
            className={`relative z-10 flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full text-white shadow-2xl transition-all transform active:scale-95 focus:outline-none focus:ring-4 ${
              speech.isRecording
                ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/50 focus:ring-rose-400 scale-105'
                : 'bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 shadow-indigo-600/40 hover:shadow-indigo-600/60 focus:ring-indigo-400 hover:scale-105'
            }`}
            aria-label={speech.isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {speech.isRecording ? (
              <Square className="w-10 h-10 sm:w-12 sm:h-12 fill-white animate-pulse" />
            ) : (
              <Mic className="w-12 h-12 sm:w-14 sm:h-14 stroke-[2]" />
            )}
          </button>
        </div>

        {/* Live Timer & Recording Status Indicator */}
        <div className="mt-6 text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {speech.isRecording ? (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  RECORDING MICROPHONE
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] font-mono">gemini-3.5-transcribe</span>
              </>
            ) : speech.isTranscribingAudio ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  TRANSCRIBING WITH GEMINI AI...
                </span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                <span>{hasAnyTranscript ? 'RECORDING READY' : 'TAP MICROPHONE TO RECORD'}</span>
              </>
            )}
          </div>

          <p className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
            {formatTimer(speech.durationSeconds)}
          </p>

          {/* Audio volume level meter */}
          {speech.isRecording && (
            <div className="w-48 mx-auto flex items-center gap-1.5 pt-1">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500 transition-all duration-75 rounded-full"
                  style={{ width: `${Math.max(8, speech.audioLevel)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audio Playback Player when recorded audio exists */}
      {speech.recordedAudioUrl && !speech.isRecording && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Recorded Microphone Audio</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Ready for transcription</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <audio src={speech.recordedAudioUrl} controls className="h-8 max-w-full sm:max-w-xs" />
          </div>
        </div>
      )}

      {/* Live Transcript Display Box */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-lg shadow-slate-100 dark:shadow-none space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Transcribed Text
            </span>
            {speech.transcriptionModel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                {speech.transcriptionModel}
              </span>
            )}
          </div>

          {hasAnyTranscript && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">
                {speech.transcript.split(/\s+/).filter(Boolean).length} words
              </span>
              <button
                type="button"
                onClick={speech.clearTranscript}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                title="Clear transcript"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Text scroll window */}
        <div className="min-h-[140px] max-h-[220px] overflow-y-auto rounded-xl p-3 bg-slate-50/70 dark:bg-slate-950/50 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {speech.isTranscribingAudio ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-2">
              <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Transcribing audio using model gemini-3.5-transcribe...
              </p>
              <p className="text-[11px] text-slate-400">
                Converting spoken voice into text document transcript
              </p>
            </div>
          ) : speech.transcript || speech.interimTranscript ? (
            <div>
              <span>{speech.transcript}</span>
              {speech.interimTranscript && (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium italic ml-1">
                  {speech.interimTranscript}
                </span>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400 dark:text-slate-500">
              <Mic className="w-6 h-6 mb-1.5 opacity-50" />
              <p className="text-xs">
                {speech.isRecording
                  ? 'Listening to microphone... Speak clearly.'
                  : 'Tap the record button to speak into your microphone and transcribe into text.'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => speech.loadSampleTranscript('meeting')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Load Meeting Sample
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  onClick={() => speech.loadSampleTranscript('lecture')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Load Lecture Sample
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Transcribe with gemini-3.5-transcribe Action Bar */}
        {speech.hasAudioRecording && !speech.isRecording && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Model: <code className="font-mono text-indigo-600 dark:text-indigo-400">{speech.transcriptionModel || 'gemini-3.5-transcribe'}</code></span>
            </span>
            <button
              onClick={speech.transcribeRecordedAudioWithAI}
              disabled={speech.isTranscribingAudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
            >
              {speech.isTranscribingAudio ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Transcribing with gemini-3.5-transcribe...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Re-transcribe with gemini-3.5-transcribe</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Quick Template Picker & Direct Document Generation */}
      {hasAnyTranscript && !speech.isRecording && (
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Generate Document From Audio
              </span>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              Ready to structure
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setSelectedQuickTemplate(tmpl.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedQuickTemplate === tmpl.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                {tmpl.name}
              </button>
            ))}
          </div>

          {onQuickGenerate && (
            <button
              type="button"
              onClick={() => onQuickGenerate(selectedQuickTemplate)}
              disabled={speech.isTranscribingAudio}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/35 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Format into {selectedQuickTemplate} (.docx ready)</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {/* Upload Audio File fallback button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="audio/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={speech.isRecording || speech.isTranscribingAudio}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
        >
          <FileAudio className="w-4 h-4 text-indigo-500" />
          <span>Upload Audio File</span>
        </button>

        {/* Proceed to Edit & Format button */}
        <button
          type="button"
          onClick={onProceedToEdit}
          disabled={!hasAnyTranscript || speech.isRecording || speech.isTranscribingAudio}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 text-white font-semibold text-xs sm:text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Review & Choose Template</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
