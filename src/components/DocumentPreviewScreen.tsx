import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Share2,
  Save,
  Check,
  Edit3,
  Eye,
  FileCheck,
  PlusCircle,
  Copy,
} from 'lucide-react';
import { generateDocxBlob, downloadDocxBlob, shareDocxDocument } from '../services/docxExport.ts';

interface DocumentPreviewScreenProps {
  title: string;
  template: string;
  transcript: string;
  content: string;
  documentId?: string;
  isSavedInFirestore: boolean;
  isSaving: boolean;
  onTitleChange: (newTitle: string) => void;
  onContentChange: (newContent: string) => void;
  onSaveToFirestore: () => Promise<void>;
  onNewRecording: () => void;
  onBackToEdit: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const DocumentPreviewScreen: React.FC<DocumentPreviewScreenProps> = ({
  title,
  template,
  content,
  isSavedInFirestore,
  isSaving,
  onTitleChange,
  onContentChange,
  onSaveToFirestore,
  onNewRecording,
  onBackToEdit,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Markdown renderer for Formatted Preview tab
  const renderFormattedPreview = (markdown: string) => {
    const lines = markdown.split('\n');
    return (
      <div className="space-y-3 font-sans text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }

          if (trimmed.startsWith('# ')) {
            return (
              <h1
                key={idx}
                className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white pt-2 pb-1 border-b border-slate-100 dark:border-slate-800"
              >
                {trimmed.replace(/^#\s+/, '')}
              </h1>
            );
          }

          if (trimmed.startsWith('## ')) {
            return (
              <h2
                key={idx}
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white pt-3 pb-0.5 text-indigo-700 dark:text-indigo-400"
              >
                {trimmed.replace(/^##\s+/, '')}
              </h2>
            );
          }

          if (trimmed.startsWith('### ')) {
            return (
              <h3
                key={idx}
                className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white pt-2 text-slate-800 dark:text-slate-200"
              >
                {trimmed.replace(/^###\s+/, '')}
              </h3>
            );
          }

          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            const bulletText = trimmed.replace(/^[-*•]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                <p className="flex-1">
                  {renderInlineBoldAndItalics(bulletText)}
                </p>
              </div>
            );
          }

          if (/^\d+\.\s+/.test(trimmed)) {
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            const num = numMatch ? numMatch[1] : '';
            const text = numMatch ? numMatch[2] : trimmed;
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 text-xs mt-0.5">
                  {num}.
                </span>
                <p className="flex-1">{renderInlineBoldAndItalics(text)}</p>
              </div>
            );
          }

          return (
            <p key={idx} className="leading-relaxed">
              {renderInlineBoldAndItalics(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineBoldAndItalics = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-slate-700 dark:text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const blob = await generateDocxBlob({
        title,
        template,
        content,
      });
      const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_') || 'VoiceDoc'}.docx`;
      downloadDocxBlob(blob, filename);
      onShowToast(`Exported "${filename}" successfully!`, 'success');
    } catch (err: any) {
      console.error('Docx export error:', err);
      onShowToast('Failed to export DOCX file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const blob = await generateDocxBlob({
        title,
        template,
        content,
      });
      const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_') || 'VoiceDoc'}.docx`;
      const res = await shareDocxDocument({
        blob,
        filename,
        title,
        text: `Here is the document: ${title}`,
      });

      if (res.method === 'web-share') {
        onShowToast('Shared document successfully!', 'success');
      } else {
        onShowToast('Downloaded document for sharing!', 'info');
      }
    } catch (err: any) {
      console.error('Share error:', err);
      onShowToast('Could not share document.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${content}`);
      setCopied(true);
      onShowToast('Document text copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not copy to clipboard.', 'error');
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit & Template</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Save to Firestore Button */}
          <button
            onClick={onSaveToFirestore}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              isSavedInFirestore
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
            {isSaving ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Saving...</span>
              </>
            ) : isSavedInFirestore ? (
              <>
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>Saved to Cloud</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save to Cloud</span>
              </>
            )}
          </button>

          {/* New Recording Button */}
          <button
            onClick={onNewRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <PlusCircle className="w-4 h-4 text-indigo-500" />
            <span className="hidden xs:inline">New Voice Note</span>
          </button>
        </div>
      </div>

      {/* Title & Metadata Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Document Title (Editable)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-lg sm:text-xl font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition py-1"
            placeholder="Document Title"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400">
              {template}
            </span>
            <span className="text-slate-400">• {wordCount} words</span>
          </div>

          {/* Tab Switcher: Formatted View vs Raw Edit */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                activeTab === 'edit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Content View / Editor Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        {activeTab === 'preview' ? (
          <div className="min-h-[300px]">
            {renderFormattedPreview(content)}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Markdown & text formatting supported</span>
              <span>{content.length} characters</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              rows={14}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-4 text-sm font-mono leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y"
            />
          </div>
        )}
      </div>

      {/* Export & Sharing Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Export .docx Button */}
        <button
          onClick={handleExportDocx}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
        >
          {isExporting ? (
            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Export .DOCX</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
        >
          {isSharing ? (
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Share2 className="w-4 h-4 text-indigo-500" />
          )}
          <span>Share Document</span>
        </button>

        {/* Copy to clipboard Button */}
        <button
          onClick={handleCopyText}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4 text-indigo-500" />
          )}
          <span>{copied ? 'Copied!' : 'Copy Text'}</span>
        </button>
      </div>
    </div>
  );
};
