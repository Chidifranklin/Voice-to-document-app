import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  FileText,
  Calendar,
  Download,
  Trash2,
  Edit2,
  FolderOpen,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { VoiceDocument } from '../types/document.ts';
import { generateDocxBlob, downloadDocxBlob } from '../services/docxExport.ts';

interface DocumentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: VoiceDocument[];
  onSelectDocument: (doc: VoiceDocument) => void;
  onRenameDocument: (docId: string, newTitle: string) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const DocumentsListModal: React.FC<DocumentsListModalProps> = ({
  isOpen,
  onClose,
  documents,
  onSelectDocument,
  onRenameDocument,
  onDeleteDocument,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('All');
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.transcript.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTemplate =
        selectedTemplateFilter === 'All' || doc.template === selectedTemplateFilter;
      return matchesSearch && matchesTemplate;
    });
  }, [documents, searchTerm, selectedTemplateFilter]);

  if (!isOpen) return null;

  const handleStartRename = (doc: VoiceDocument) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.title);
  };

  const handleConfirmRename = async (docId: string) => {
    if (!renameValue.trim()) return;
    try {
      await onRenameDocument(docId, renameValue.trim());
      setRenamingDocId(null);
      onShowToast('Document renamed successfully!', 'success');
    } catch {
      onShowToast('Failed to rename document.', 'error');
    }
  };

  const handleConfirmDelete = async (docId: string) => {
    try {
      await onDeleteDocument(docId);
      setDeletingDocId(null);
      onShowToast('Document deleted.', 'info');
    } catch {
      onShowToast('Failed to delete document.', 'error');
    }
  };

  const handleQuickExport = async (doc: VoiceDocument) => {
    try {
      const blob = await generateDocxBlob({
        title: doc.title,
        template: doc.template,
        content: doc.content,
        dateStr: new Date(doc.createdAt).toLocaleDateString(),
      });
      const filename = `${doc.title.replace(/[/\\?%*:|"<>]/g, '_')}.docx`;
      downloadDocxBlob(blob, filename);
      onShowToast(`Exported "${filename}"!`, 'success');
    } catch {
      onShowToast('Failed to export DOCX.', 'error');
    }
  };

  const templatesList = ['All', 'Meeting Notes', 'Lecture Notes', 'Memo', 'Letter', 'Journal'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Saved Documents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {documents.length} document{documents.length === 1 ? '' : 's'} stored in Cloud Firestore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search past notes, titles, or transcripts..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {templatesList.map((tmpl) => (
              <button
                key={tmpl}
                onClick={() => setSelectedTemplateFilter(tmpl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedTemplateFilter === tmpl
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {tmpl}
              </button>
            ))}
          </div>
        </div>

        {/* Document Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm font-semibold">No documents found</p>
              <p className="text-xs max-w-xs mx-auto">
                {searchTerm
                  ? 'No documents matched your query. Try a different keyword.'
                  : 'Start a voice recording to generate your first structured note!'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isRenaming = renamingDocId === doc.id;
              const isDeleting = deletingDocId === doc.id;
              const dateStr = new Date(doc.updatedAt || doc.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={doc.id}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Renaming inline input or Title display */}
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-sm font-semibold rounded-lg border border-indigo-500 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmRename(doc.id);
                              if (e.key === 'Escape') setRenamingDocId(null);
                            }}
                          />
                          <button
                            onClick={() => handleConfirmRename(doc.id)}
                            className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Save title"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRenamingDocId(null)}
                            className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h3
                          onClick={() => {
                            onSelectDocument(doc);
                            onClose();
                          }}
                          className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        >
                          {doc.title}
                        </h3>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {doc.template}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateStr}
                        </span>
                        <span>•</span>
                        <span>{doc.content.split(/\s+/).filter(Boolean).length} words</span>
                      </div>

                      {/* Content snippet preview */}
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {doc.content.replace(/[#*`-]/g, '')}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => {
                        onSelectDocument(doc);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open Document</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Rename Button */}
                      <button
                        onClick={() => handleStartRename(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Rename document"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Export .docx Button */}
                      <button
                        onClick={() => handleQuickExport(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Export as .DOCX Word file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      {isDeleting ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg">
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold px-1">
                            Delete?
                          </span>
                          <button
                            onClick={() => handleConfirmDelete(doc.id)}
                            className="p-1 rounded bg-rose-600 text-white text-[10px]"
                            title="Confirm delete"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeletingDocId(null)}
                            className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingDocId(doc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-center text-[11px] text-slate-400">
          All documents sync to your private Cloud Firestore collection and persist offline.
        </div>
      </div>
    </div>
  );
};
