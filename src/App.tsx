import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { useSpeechRecognition } from './hooks/useSpeechRecognition.ts';
import { Header } from './components/Header.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { RecordScreen } from './components/RecordScreen.tsx';
import { EditTranscriptScreen } from './components/EditTranscriptScreen.tsx';
import { DocumentPreviewScreen } from './components/DocumentPreviewScreen.tsx';
import { DocumentsListModal } from './components/DocumentsListModal.tsx';
import { SecurityProbeModal } from './components/SecurityProbeModal.tsx';
import { LiveVoiceModal } from './components/LiveVoiceModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { Toast, ToastMessage } from './components/Toast.tsx';
import {
  createOrUpdateDocument,
  renameDocument,
  deleteDocument,
  subscribeToUserDocuments,
} from './services/documentRepository.ts';
import type { VoiceDocument, DocumentTemplate } from './types/document.ts';
import { Mic } from 'lucide-react';

function VoiceDocMain() {
  const { user, loading: authLoading } = useAuth();
  const speech = useSpeechRecognition();

  // App screens
  const [currentScreen, setCurrentScreen] = useState<'record' | 'edit' | 'preview'>('record');

  // Active document state
  const [activeDocId, setActiveDocId] = useState<string | undefined>(undefined);
  const [docTitle, setDocTitle] = useState('Untitled Note');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>('Meeting Notes');
  const [formattedContent, setFormattedContent] = useState('');
  const [isSavedInFirestore, setIsSavedInFirestore] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Firestore library
  const [savedDocs, setSavedDocs] = useState<VoiceDocument[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSecurityTestOpen, setIsSecurityTestOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Subscribe to user documents in Firestore
  useEffect(() => {
    if (!user) {
      setSavedDocs([]);
      return;
    }

    const unsubscribe = subscribeToUserDocuments(
      user.uid,
      (docs) => {
        setSavedDocs(docs);
      },
      (err) => {
        console.error('Firestore subscribe error:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle AI generation
  const handleGenerate = async (template: DocumentTemplate, customInstructions?: string) => {
    if (!speech.transcript.trim()) {
      showToast('Transcript is empty. Please speak or type some text first.', 'error');
      return;
    }

    setIsGenerating(true);
    setSelectedTemplate(template);

    try {
      const response = await fetch('/api/ai/clean-and-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: speech.transcript,
          template,
          customInstructions,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      const generatedTitle = data.title || `${template} - ${new Date().toLocaleDateString()}`;
      const generatedContent = data.formattedContent || speech.transcript;

      setDocTitle(generatedTitle);
      setFormattedContent(generatedContent);
      setIsSavedInFirestore(false);
      setCurrentScreen('preview');
      showToast(`Document generated with ${template} template!`, 'success');

      // Auto-save to Firestore if user is logged in
      if (user) {
        try {
          setIsSaving(true);
          const savedId = await createOrUpdateDocument(
            user.uid,
            {
              title: generatedTitle,
              template,
              transcript: speech.transcript,
              content: generatedContent,
            },
            activeDocId
          );
          setActiveDocId(savedId);
          setIsSavedInFirestore(true);
        } catch (saveErr) {
          console.warn('Auto-save to Firestore deferred or failed:', saveErr);
        } finally {
          setIsSaving(false);
        }
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      showToast(err.message || 'Failed to structure document.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual save to Firestore
  const handleSaveToFirestore = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const savedId = await createOrUpdateDocument(
        user.uid,
        {
          title: docTitle,
          template: selectedTemplate,
          transcript: speech.transcript,
          content: formattedContent,
        },
        activeDocId
      );
      setActiveDocId(savedId);
      setIsSavedInFirestore(true);
      showToast('Saved to Cloud Firestore!', 'success');
    } catch (err: any) {
      console.error('Save to Firestore error:', err);
      showToast('Could not save document to cloud.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // New voice recording
  const handleNewRecording = () => {
    speech.clearTranscript();
    setActiveDocId(undefined);
    setDocTitle('Untitled Note');
    setFormattedContent('');
    setIsSavedInFirestore(false);
    setCurrentScreen('record');
  };

  // Select document from library
  const handleSelectDocument = (doc: VoiceDocument) => {
    setActiveDocId(doc.id);
    setDocTitle(doc.title);
    setSelectedTemplate(doc.template as DocumentTemplate);
    speech.setManualTranscript(doc.transcript || '');
    setFormattedContent(doc.content);
    setIsSavedInFirestore(true);
    setCurrentScreen('preview');
  };

  // Rename document
  const handleRenameDocument = async (docId: string, newTitle: string) => {
    if (!user) return;
    await renameDocument(user.uid, docId, newTitle);
    if (activeDocId === docId) {
      setDocTitle(newTitle);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    if (!user) return;
    await deleteDocument(user.uid, docId);
    if (activeDocId === docId) {
      handleNewRecording();
    }
  };

  // Auth loading splash
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 animate-bounce">
          <Mic className="w-8 h-8" />
        </div>
        <p className="mt-4 font-bold text-slate-800 dark:text-slate-200 text-base">
          Loading VoiceDoc...
        </p>
      </div>
    );
  }

  // Enforce authentication on all screens
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <Header
        docCount={savedDocs.length}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenSecurityTest={() => setIsSecurityTestOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentScreen === 'record' && (
          <RecordScreen
            speech={speech}
            onProceedToEdit={() => setCurrentScreen('edit')}
            onQuickGenerate={(tmpl) => handleGenerate(tmpl)}
            onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
          />
        )}

        {currentScreen === 'edit' && (
          <EditTranscriptScreen
            transcript={speech.transcript}
            onTranscriptChange={speech.setManualTranscript}
            onBackToRecord={() => setCurrentScreen('record')}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}

        {currentScreen === 'preview' && (
          <DocumentPreviewScreen
            title={docTitle}
            template={selectedTemplate}
            transcript={speech.transcript}
            content={formattedContent}
            documentId={activeDocId}
            isSavedInFirestore={isSavedInFirestore}
            isSaving={isSaving}
            onTitleChange={(t) => {
              setDocTitle(t);
              setIsSavedInFirestore(false);
            }}
            onContentChange={(c) => {
              setFormattedContent(c);
              setIsSavedInFirestore(false);
            }}
            onSaveToFirestore={handleSaveToFirestore}
            onNewRecording={handleNewRecording}
            onBackToEdit={() => setCurrentScreen('edit')}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Document Library Modal */}
      <DocumentsListModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        documents={savedDocs}
        onSelectDocument={handleSelectDocument}
        onRenameDocument={handleRenameDocument}
        onDeleteDocument={handleDeleteDocument}
        onShowToast={showToast}
      />

      {/* Security Probe Modal */}
      <SecurityProbeModal
        isOpen={isSecurityTestOpen}
        onClose={() => setIsSecurityTestOpen(false)}
      />

      {/* Live Voice Conversation Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        onExportToDocument={(conversationTranscript) => {
          speech.setManualTranscript(conversationTranscript);
          setCurrentScreen('edit');
          setIsLiveVoiceOpen(false);
          showToast('Voice conversation copied to transcript! Select a template to structure it.', 'success');
        }}
      />

      {/* Offline Toast & Indicator */}
      <OfflineIndicator />

      {/* Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <VoiceDocMain />
    </AuthProvider>
  );
}
