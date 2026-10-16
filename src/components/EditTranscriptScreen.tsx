import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Users,
  GraduationCap,
  FileText,
  Mail,
  BookHeart,
  SlidersHorizontal,
  CheckCircle,
} from 'lucide-react';
import { TEMPLATES, DocumentTemplate } from '../types/document.ts';

interface EditTranscriptScreenProps {
  transcript: string;
  onTranscriptChange: (text: string) => void;
  onBackToRecord: () => void;
  onGenerate: (template: DocumentTemplate, customInstructions?: string) => Promise<void>;
  isGenerating: boolean;
}

export const EditTranscriptScreen: React.FC<EditTranscriptScreenProps> = ({
  transcript,
  onTranscriptChange,
  onBackToRecord,
  onGenerate,
  isGenerating,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>('Meeting Notes');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  const getTemplateIcon = (name: string) => {
    switch (name) {
      case 'Meeting Notes':
        return <Users className="w-5 h-5" />;
      case 'Lecture Notes':
        return <GraduationCap className="w-5 h-5" />;
      case 'Memo':
        return <FileText className="w-5 h-5" />;
      case 'Letter':
        return <Mail className="w-5 h-5" />;
      case 'Journal':
        return <BookHeart className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const handleGenerateClick = async () => {
    await onGenerate(selectedTemplate, customInstructions.trim() || undefined);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToRecord}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Record</span>
        </button>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Step 2 of 3 • Review & Format
        </span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Review Transcript & Pick Template
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Make any manual tweaks before AI removes filler words and structures your document.
        </p>
      </div>

      {/* Transcript Textarea Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
            Spoken Transcript (Editable)
          </span>
          <span>{wordCount} words • {transcript.length} chars</span>
        </div>

        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          rows={7}
          disabled={isGenerating}
          placeholder="Speak or type your content here..."
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-3.5 text-sm leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y font-normal"
        />
      </div>

      {/* Template Selector Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Choose Structure Template
          </h3>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            {selectedTemplate}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tmpl.id)}
                disabled={isGenerating}
                className={`relative flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm shadow-indigo-600/10 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {getTemplateIcon(tmpl.id)}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {tmpl.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {tmpl.description}
                  </p>
                </div>

                {isSelected && (
                  <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 absolute top-3.5 right-3.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Custom Instructions */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <button
          type="button"
          onClick={() => setShowCustomInstructions((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Additional AI Instructions (Optional)</span>
          </div>
          <span className="text-indigo-600 dark:text-indigo-400">
            {showCustomInstructions ? 'Hide' : 'Add details'}
          </span>
        </button>

        {showCustomInstructions && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 animate-in fade-in">
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Emphasize budget decisions, write in British English, or highlight deadlines"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400">
              VoiceDoc will instruct Gemini to take this into account while cleaning and organizing.
            </p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        type="button"
        onClick={handleGenerateClick}
        disabled={isGenerating || !transcript.trim()}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:brightness-105 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span>AI is cleaning & structuring document...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Generate {selectedTemplate}</span>
          </>
        )}
      </button>
    </div>
  );
};
