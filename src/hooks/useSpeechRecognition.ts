import { useState, useRef, useEffect, useCallback } from 'react';

export type TranscriptionMode = 'gemini-3.5-transcribe' | 'web-speech';

export interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  durationSeconds: number;
  audioLevel: number; // 0 to 100 for visualizer
  isSpeechSupported: boolean;
  isTranscribingAudio: boolean;
  hasAudioRecording: boolean;
  isPermissionDenied: boolean;
  transcriptionMode: TranscriptionMode;
  recordedAudioUrl: string | null;
  transcriptionModel: string | null;
  setTranscriptionMode: (mode: TranscriptionMode) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearTranscript: () => void;
  setManualTranscript: (text: string) => void;
  loadSampleTranscript: (type?: 'meeting' | 'lecture' | 'memo') => void;
  transcribeRecordedAudioWithAI: () => Promise<string>;
  transcribeAudioFileWithAI: (file: File) => Promise<string>;
  error: string | null;
  clearError: () => void;
}

const readBlobAsBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) {
        reject(new Error('Failed to read audio blob'));
        return;
      }
      const base64Data = dataUrl.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob as Base64'));
    reader.readAsDataURL(blob);
  });
};

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [hasAudioRecording, setHasAudioRecording] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>('gemini-3.5-transcribe');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [transcriptionModel, setTranscriptionModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isManuallyStoppedRef = useRef(false);
  const modeRef = useRef<TranscriptionMode>('gemini-3.5-transcribe');
  const liveWordsRef = useRef<string>('');

  useEffect(() => {
    modeRef.current = transcriptionMode;
  }, [transcriptionMode]);

  // Check Web Speech API support
  const win = typeof window !== 'undefined' ? (window as unknown as Record<string, any>) : {};
  const SpeechRecognitionConstructor = win['SpeechRecognition'] || win['webkitSpeechRecognition'];
  const isSpeechSupported = !!SpeechRecognitionConstructor;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  const setupAudioMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(level);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('Audio meter initialization skipped:', e);
    }
  };

  const executeGeminiTranscription = async (blob: Blob): Promise<string> => {
    setIsTranscribingAudio(true);
    setError(null);

    try {
      const base64 = await readBlobAsBase64(blob);

      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: blob.type || 'audio/webm',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const resultText = (data.transcript || '').trim();

      if (resultText.length > 0) {
        setTranscript(resultText);
        liveWordsRef.current = resultText;
        setTranscriptionModel(data.model || 'gemini-3.5-transcribe');
        return resultText;
      } else if (liveWordsRef.current.trim().length > 0) {
        // Fall back to live speech recognition if audio was silent
        setTranscript(liveWordsRef.current);
        return liveWordsRef.current;
      }

      return resultText;
    } catch (e: any) {
      console.error('Audio transcription error:', e);
      // If live words were collected from speech recognition, preserve them!
      if (liveWordsRef.current.trim().length > 0) {
        setTranscript(liveWordsRef.current);
        setError(`AI audio transcription note: ${e.message}. Preserved live microphone transcript.`);
      } else {
        setError(`Audio transcription note: ${e.message}`);
      }
      throw e;
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  const startRecording = useCallback(async () => {
    setError(null);
    setIsPermissionDenied(false);
    setInterimTranscript('');
    isManuallyStoppedRef.current = false;
    audioChunksRef.current = [];
    recordedBlobRef.current = null;
    setHasAudioRecording(false);
    liveWordsRef.current = '';

    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    let streamObtained = false;
    let recognitionStarted = false;

    // 1. Request microphone access via getUserMedia for MediaRecorder
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
        setupAudioMeter(stream);
        streamObtained = true;

        try {
          let recorderOptions: MediaRecorderOptions = {};
          if (typeof MediaRecorder.isTypeSupported === 'function') {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              recorderOptions = { mimeType: 'audio/webm;codecs=opus' };
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
              recorderOptions = { mimeType: 'audio/webm' };
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              recorderOptions = { mimeType: 'audio/mp4' };
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
              recorderOptions = { mimeType: 'audio/ogg' };
            }
          }

          const recorder = new MediaRecorder(stream, recorderOptions);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          recorder.onstop = () => {
            // Stop media stream tracks after recording finished
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach((track) => track.stop());
              mediaStreamRef.current = null;
            }

            if (audioChunksRef.current.length > 0) {
              const detectedMime = recorder.mimeType || 'audio/webm';
              const blob = new Blob(audioChunksRef.current, { type: detectedMime });
              recordedBlobRef.current = blob;
              setHasAudioRecording(true);
              const url = URL.createObjectURL(blob);
              setRecordedAudioUrl(url);

              // Transcribe recorded microphone audio
              executeGeminiTranscription(blob).catch((err) => {
                console.warn('Transcription after stop error:', err);
              });
            }
          };

          recorder.start(500);
        } catch (recErr) {
          console.warn('MediaRecorder init skipped:', recErr);
        }
      } catch (err: any) {
        console.warn('getUserMedia error:', err);
        const isPermission =
          err?.name === 'NotAllowedError' ||
          err?.name === 'PermissionDeniedError' ||
          err?.message?.toLowerCase().includes('permission denied') ||
          err?.message?.toLowerCase().includes('not allowed');

        if (isPermission) {
          setIsPermissionDenied(true);
        }
      }
    }

    // 2. Setup Web Speech Recognition for real-time live preview
    if (SpeechRecognitionConstructor) {
      try {
        const recognition = new SpeechRecognitionConstructor();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i];
            const text = item[0].transcript;
            if (item.isFinal) {
              currentFinal += text + ' ';
            } else {
              currentInterim += text;
            }
          }

          if (currentFinal) {
            setTranscript((prev) => {
              const updated = (prev ? `${prev} ${currentFinal}` : currentFinal).trim();
              liveWordsRef.current = updated;
              return updated;
            });
          }
          setInterimTranscript(currentInterim);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition event error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setIsPermissionDenied(true);
            setError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
          }
        };

        recognition.onend = () => {
          if (!isManuallyStoppedRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionStarted = true;
      } catch (e: any) {
        console.warn('SpeechRecognition start failed:', e);
        if (e?.name === 'NotAllowedError' || e?.message?.includes('Permission denied')) {
          setIsPermissionDenied(true);
        }
      }
    }

    // If both failed to start
    if (!streamObtained && !recognitionStarted) {
      setIsPermissionDenied(true);
      setError('Microphone permission is blocked in your browser. Please allow microphone access or load a sample note below.');
      return;
    }

    // Start timer and recording state
    setDurationSeconds(0);
    setIsRecording(true);
    timerIntervalRef.current = setInterval(() => {
      setDurationSeconds((sec) => sec + 1);
    }, 1000);
  }, [SpeechRecognitionConstructor]);

  const stopRecording = useCallback(async () => {
    isManuallyStoppedRef.current = true;
    setIsRecording(false);
    setInterimTranscript('');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
      } catch {}
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    } else if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setDurationSeconds(0);
    recordedBlobRef.current = null;
    setHasAudioRecording(false);
    setIsPermissionDenied(false);
    setTranscriptionModel(null);
    liveWordsRef.current = '';
    setError(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  }, [recordedAudioUrl]);

  const setManualTranscript = useCallback((text: string) => {
    setTranscript(text);
    liveWordsRef.current = text;
  }, []);

  const loadSampleTranscript = useCallback((type: 'meeting' | 'lecture' | 'memo' = 'meeting') => {
    setError(null);
    setIsPermissionDenied(false);

    let text = '';
    if (type === 'lecture') {
      text =
        "Welcome everyone to today's computer science lecture on distributed consensus algorithms. Um, so basically, Paxos and Raft are the two most common protocols used in modern cloud databases. Like, Paxos was designed by Leslie Lamport, and while it's mathematically sound, it is notoriously hard to understand and implement in real world systems. So in 2014, Ongaro and Ousterhout created Raft to provide equivalent safety but with leader election and log replication broken into distinct, manageable steps. Remember for your exam: a quorum requires at least N over 2 plus 1 active nodes to agree before committing any state.";
    } else if (type === 'memo') {
      text =
        "Memo to all engineering leads regarding our migration to progressive web applications. Over the past three months, mobile web traffic increased by 45 percent, but users on 3G connections report high bounce rates. By implementing service workers and offline Firestore persistence, we have reduced load times from 4.2 seconds to 600 milliseconds. Recommendation: all core product teams should migrate their frontend toolchains to PWA standards by end of Q4. Action item: Dave will host an engineering workshop next Tuesday.";
    } else {
      text =
        "Good morning everyone, let's start the weekly sync. Um, so basically Sarah gave an update on the VoiceDoc auth flow. Google login and email password authentication are fully working and tested. Next, Chidi noted that the Cloud Firestore security rules are deployed and verified with ABAC zero trust rules. Action items: Dave needs to finish the Word docx export styling by Thursday afternoon, and Sarah will verify offline persistence on weak mobile connections before our client demo next Monday.";
    }
    setTranscript(text);
    liveWordsRef.current = text;
    setTranscriptionModel('sample-audio-transcription');
  }, []);

  const transcribeRecordedAudioWithAI = useCallback(async (): Promise<string> => {
    const blob = recordedBlobRef.current;
    if (!blob) {
      throw new Error('No recorded audio available to transcribe.');
    }
    return executeGeminiTranscription(blob);
  }, []);

  const transcribeAudioFileWithAI = useCallback(async (file: File): Promise<string> => {
    recordedBlobRef.current = file;
    setHasAudioRecording(true);
    const url = URL.createObjectURL(file);
    setRecordedAudioUrl(url);
    return executeGeminiTranscription(file);
  }, []);

  return {
    isRecording,
    transcript,
    interimTranscript,
    durationSeconds,
    audioLevel,
    isSpeechSupported,
    isTranscribingAudio,
    hasAudioRecording,
    isPermissionDenied,
    transcriptionMode,
    recordedAudioUrl,
    transcriptionModel,
    setTranscriptionMode,
    startRecording,
    stopRecording,
    clearTranscript,
    setManualTranscript,
    loadSampleTranscript,
    transcribeRecordedAudioWithAI,
    transcribeAudioFileWithAI,
    error,
    clearError: () => {
      setError(null);
      setIsPermissionDenied(false);
    },
  };
}
