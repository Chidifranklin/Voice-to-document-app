import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase.ts';
import { handleFirestoreError, OperationType } from './firestoreErrors.ts';
import type { VoiceDocument } from '../types/document.ts';

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function createOrUpdateDocument(
  userId: string,
  docData: {
    title: string;
    template: string;
    transcript: string;
    content: string;
  },
  existingDocId?: string
): Promise<string> {
  const docId = existingDocId || sanitizeId(`doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const docPath = `users/${userId}/documents/${docId}`;
  const now = new Date().toISOString();

  const payload: VoiceDocument = {
    id: docId,
    userId,
    title: docData.title.trim().slice(0, 300) || 'Untitled Document',
    template: docData.template || 'Meeting Notes',
    transcript: docData.transcript.slice(0, 100000),
    content: docData.content.slice(0, 200000),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'users', userId, 'documents', docId);
    if (existingDocId) {
      // Retain original createdAt if updating
      try {
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) {
          const prev = existingSnap.data() as VoiceDocument;
          payload.createdAt = prev.createdAt || now;
        }
      } catch {
        // Fall back to now
      }
    }

    await setDoc(docRef, payload, { merge: true });
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingDocId ? OperationType.UPDATE : OperationType.CREATE,
      docPath
    );
  }
}

export async function renameDocument(
  userId: string,
  docId: string,
  newTitle: string
): Promise<void> {
  const docPath = `users/${userId}/documents/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'documents', docId);
    await setDoc(
      docRef,
      {
        title: newTitle.trim().slice(0, 300) || 'Untitled Document',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteDocument(
  userId: string,
  docId: string
): Promise<void> {
  const docPath = `users/${userId}/documents/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'documents', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function getSingleDocument(
  userId: string,
  docId: string
): Promise<VoiceDocument | null> {
  const docPath = `users/${userId}/documents/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'documents', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as VoiceDocument;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

export function subscribeToUserDocuments(
  userId: string,
  onData: (docs: VoiceDocument[]) => void,
  onError?: (err: Error) => void
): () => void {
  const collectionPath = `users/${userId}/documents`;
  const q = query(
    collection(db, 'users', userId, 'documents'),
    orderBy('updatedAt', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const docs: VoiceDocument[] = [];
      snapshot.forEach((d) => {
        docs.push(d.data() as VoiceDocument);
      });
      onData(docs);
    },
    (error) => {
      console.error('Subscription error for user documents:', error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      } catch (wrapped) {
        // Logged
      }
    }
  );

  return unsubscribe;
}

// Function to test security rules: Attempt to read another user's document
export async function testUnauthorizedAccess(targetUserId: string = 'someone_else_123'): Promise<{
  blocked: boolean;
  statusText: string;
}> {
  const path = `users/${targetUserId}/documents/forbidden_doc`;
  try {
    const forbiddenRef = doc(db, 'users', targetUserId, 'documents', 'forbidden_doc');
    await getDoc(forbiddenRef);
    return {
      blocked: false,
      statusText: 'VULNERABILITY: Read succeeded! Security rules did not block unauthorized access.',
    };
  } catch (err: any) {
    // Expected behavior: PERMISSION_DENIED
    const isPermissionError =
      err?.code === 'permission-denied' ||
      err?.message?.includes('Missing or insufficient permissions') ||
      err?.message?.includes('permission-denied');

    return {
      blocked: isPermissionError,
      statusText: isPermissionError
        ? 'SECURE: Access was blocked by Firestore Security Rules (PERMISSION_DENIED).'
        : `Blocked with error: ${err?.message || 'Permission denied'}`,
    };
  }
}
