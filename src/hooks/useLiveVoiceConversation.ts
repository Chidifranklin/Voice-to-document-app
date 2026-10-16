import { useState, useRef, useCallback, useEffect } from 'react';

export interface ConversationTurn {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

export interface UseLiveVoiceConversationReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isMicActive: boolean;
  turns: ConversationTurn[];
  currentTurn: string;
  userLiveSpeech: string;
  error: string | null;
  startLiveConversation: () => Promise<void>;
  stopLiveConversation: () => void;
  sendTextMessage: (text: string) => void;
  clearConversation: () => void;
  exportToVoiceDocTranscript: () => string;
}

function floatTo16BitPCMBase64(input: Float32Array): string {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(output.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64PCMToAudioBuffer(ctx: AudioContext, base64: string): AudioBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.copyToChannel(float32, 0);
  return buffer;
}

export function useLiveVoiceConversation(): UseLiveVoiceConversationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [userLiveSpeech, setUserLiveSpeech] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const currentModelTextRef = useRef<string>('');

  const stopLiveConversation = useCallback(() => {
    setIsConnecting(false);
    setIsConnected(false);
    setIsSpeaking(false);
    setIsMicActive(false);

    // Stop active audio sources
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;

    // Disconnect mic audio stream
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopLiveConversation();
    };
  }, [stopLiveConversation]);

  const startLiveConversation = useCallback(async () => {
    stopLiveConversation();
    setError(null);
    setIsConnecting(true);
    setCurrentTurn('');
    setUserLiveSpeech('');
    currentModelTextRef.current = '';

    try {
      // 1. Setup AudioContexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      // Input capture at 16kHz as required by Gemini Live
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      // Output playback at 24kHz as returned by Gemini Live
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;

      // 2. Capture microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Connect WebSocket to /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
        setIsMicActive(true);

        // Setup Audio streaming processor
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const channelData = e.inputBuffer.getChannelData(0);
            const base64PCM = floatTo16BitPCMBase64(channelData);
            ws.send(JSON.stringify({ audio: base64PCM }));
          }
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            console.log('Gemini Live session connected:', msg.model);
          } else if (msg.type === 'audio') {
            setIsSpeaking(true);
            if (msg.text) {
              currentModelTextRef.current += ' ' + msg.text;
              setCurrentTurn(currentModelTextRef.current.trim());
            }

            // Schedule audio chunk playback at 24kHz
            if (outputCtx && msg.audio) {
              try {
                const audioBuffer = base64PCMToAudioBuffer(outputCtx, msg.audio);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);

                const now = outputCtx.currentTime;
                const startTime = Math.max(now, nextStartTimeRef.current);
                source.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;

                activeSourcesRef.current.push(source);
                source.onended = () => {
                  activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
                  if (activeSourcesRef.current.length === 0) {
                    setIsSpeaking(false);
                    // Commit model turn to conversation history
                    if (currentModelTextRef.current.trim()) {
                      const text = currentModelTextRef.current.trim();
                      setTurns((prev) => [
                        ...prev,
                        {
                          id: Math.random().toString(36).substring(2, 9),
                          sender: 'gemini',
                          text,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        },
                      ]);
                      currentModelTextRef.current = '';
                      setCurrentTurn('');
                    }
                  }
                };
              } catch (playErr) {
                console.error('Audio playback chunk error:', playErr);
              }
            }
          } else if (msg.type === 'user_transcription') {
            if (msg.text) {
              setUserLiveSpeech(msg.text);
              setTurns((prev) => [
                ...prev,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  sender: 'user',
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }
          } else if (msg.type === 'interrupted') {
            // User interrupted model speaking: stop queued playback immediately
            activeSourcesRef.current.forEach((src) => {
              try {
                src.stop();
              } catch {}
            });
            activeSourcesRef.current = [];
            nextStartTimeRef.current = 0;
            setIsSpeaking(false);
          } else if (msg.type === 'error') {
            setError(msg.error || 'Live conversation error');
          }
        } catch (parseErr) {
          console.error('WebSocket message parsing error:', parseErr);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        setError('Failed to connect to Live voice server. Please check your connection.');
        stopLiveConversation();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setIsMicActive(false);
        setIsSpeaking(false);
      };
    } catch (err: any) {
      console.error('Failed to start Live conversation:', err);
      setError(err?.message || 'Could not start Live Voice Conversation.');
      stopLiveConversation();
    }
  }, [stopLiveConversation]);

  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text }));
    setTurns((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  const clearConversation = useCallback(() => {
    setTurns([]);
    setCurrentTurn('');
    setUserLiveSpeech('');
    currentModelTextRef.current = '';
  }, []);

  const exportToVoiceDocTranscript = useCallback((): string => {
    return turns
      .map((t) => `${t.sender === 'user' ? 'Speaker' : 'VoiceDoc AI'}: ${t.text}`)
      .join('\n\n');
  }, [turns]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isMicActive,
    turns,
    currentTurn,
    userLiveSpeech,
    error,
    startLiveConversation,
    stopLiveConversation,
    sendTextMessage,
    clearConversation,
    exportToVoiceDocTranscript,
  };
}
