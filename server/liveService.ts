import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import type { WebSocket, WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Client connected to Live Voice WebSocket (/live)");
    let session: any = null;

    try {
      const ai = getAiClient();

      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" },
            },
          },
          systemInstruction:
            "You are VoiceDoc's real-time conversational AI voice companion. You can have natural spoken discussions with the user, brainstorm document outlines, interview them about their meetings or lectures, answer questions, and help refine their thoughts. Be natural, conversational, polite, and concise.",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== 1) return; // 1 = OPEN

            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const textParts = message.serverContent?.modelTurn?.parts
              ?.map((p: any) => p.text)
              .filter(Boolean)
              .join("");
            const outputTranscription = (message.serverContent as any)?.outputAudioTranscription?.text || (message.serverContent as any)?.outputTranscription?.text;
            const inputTranscription = (message.serverContent as any)?.inputAudioTranscription?.text || (message.serverContent as any)?.inputTranscription?.text;

            if (audio) {
              clientWs.send(
                JSON.stringify({
                  type: "audio",
                  audio,
                  text: textParts || outputTranscription || "",
                })
              );
            } else if (textParts || outputTranscription) {
              clientWs.send(
                JSON.stringify({
                  type: "text",
                  text: textParts || outputTranscription || "",
                })
              );
            }

            if (inputTranscription) {
              clientWs.send(
                JSON.stringify({
                  type: "user_transcription",
                  text: inputTranscription,
                })
              );
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(
                JSON.stringify({
                  type: "interrupted",
                  interrupted: true,
                })
              );
            }
          },
          onclose: () => {
            console.log("Gemini Live session closed");
            if (clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: "session_closed" }));
            }
          },
          onerror: (err: any) => {
            console.error("Gemini Live session error:", err);
            if (clientWs.readyState === 1) {
              clientWs.send(
                JSON.stringify({
                  type: "error",
                  error: err?.message || "Live API session encountered an error",
                })
              );
            }
          },
        },
      });

      // Notify client that Live session is connected and ready
      clientWs.send(
        JSON.stringify({
          type: "connected",
          model: "gemini-3.8-live",
          message: "Connected to Gemini 3.8 Live. Start speaking!",
        })
      );

      // Handle messages from client
      clientWs.on("message", (raw: any) => {
        try {
          const data = JSON.parse(raw.toString());

          if (data.audio) {
            // Audio input from client: 16kHz PCM Base64
            session.sendRealtimeInput({
              audio: {
                data: data.audio,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          } else if (data.text) {
            session.sendRealtimeInput({
              text: data.text,
            });
          }
        } catch (msgErr) {
          console.error("Error processing client input:", msgErr);
        }
      });

      clientWs.on("close", () => {
        console.log("Client closed connection to Live WebSocket");
        if (session) {
          try {
            session.close();
          } catch {}
        }
      });
    } catch (err: any) {
      console.error("Failed to start gemini-3.8-live session:", err);
      if (clientWs.readyState === 1) {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: err?.message || "Failed to initialize gemini-3.8-live",
          })
        );
      }
    }
  });
}
