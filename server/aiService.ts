import { GoogleGenAI, Type } from "@google/genai";
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

export interface CleanAndFormatResult {
  title: string;
  formattedContent: string;
  summary: string;
}

function extractTranscriptFromResponse(response: any): string {
  let fullText = '';
  const candidates = response.candidates || [];
  for (const cand of candidates) {
    const parts = cand.content?.parts || [];
    for (const part of parts) {
      if (part.audioTranscription?.text) {
        fullText += (fullText ? ' ' : '') + part.audioTranscription.text;
      } else if (typeof part.text === 'string' && part.text.trim()) {
        fullText += (fullText ? ' ' : '') + part.text.trim();
      }
    }
  }
  if (!fullText && typeof response.text === 'string') {
    fullText = response.text.trim();
  }
  return fullText.trim();
}

export async function cleanAndFormatTranscript(params: {
  transcript: string;
  template: string;
  customInstructions?: string;
}): Promise<CleanAndFormatResult> {
  const { transcript, template, customInstructions } = params;
  if (!transcript || transcript.trim().length === 0) {
    throw new Error("Transcript content is empty.");
  }

  const ai = getAiClient();

  const systemInstruction = `You are VoiceDoc's expert document structuring engine.
Your mission is to take raw, spoken voice transcripts and convert them into beautifully structured, publication-ready documents.
Crucial rules:
1. Strip spoken filler words (e.g., "um", "uh", "you know", "like", "sort of", "kind of", "er", "ah", "I mean", "so yeah", "basically", repetitive stutters).
2. Fix run-on sentences, spoken cadence errors, and punctuation while strictly preserving the speaker's true intent, specific facts, numbers, dates, and names (including African/Nigerian names, places, and terms).
3. Apply the specific layout requested for the template:
   - "Meeting Notes": Document Title, Meeting Date/Context, Executive Summary, Key Discussion Topics, Decisions Made, Action Items (as bullet points with clear owners/tasks), Next Steps.
   - "Lecture Notes": Topic Title, Core Concepts & Key Definitions, Main Lecture Breakdown (detailed sections), Examples & Key Takeaways, Review Questions.
   - "Memo": MEMORANDUM Header (TO:, FROM:, DATE:, SUBJECT:), Executive Summary, Background & Context, Key Findings / Proposals, Next Steps.
   - "Letter": Formal date, recipient greeting, structured body paragraphs with professional flow, polite closing and sign-off placeholder.
   - "Journal": Date & Theme, Key Events of the Day, Personal Reflections & Learnings, Tomorrow's Intentions.
4. Format the formattedContent as clean, readable Markdown (using # for Title, ## for main sections, ### for subsections, - for bullet points, **bold** for key terms).
5. Generate an evocative, concise document title (under 80 characters) and a 1-2 sentence summary.`;

  const userPrompt = `Template requested: "${template || 'Meeting Notes'}"
${customInstructions ? `Additional User Instructions: "${customInstructions}"\n` : ''}
Raw Transcript:
"""
${transcript.slice(0, 30000)}
"""

Please clean filler words, correct grammar, and format into the selected template.`;

  const requestConfig = {
    systemInstruction,
    temperature: 0.2,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Concise title for the document.",
        },
        formattedContent: {
          type: Type.STRING,
          description: "Full markdown formatted document content with headings, paragraphs, and bullets.",
        },
        summary: {
          type: Type.STRING,
          description: "One or two sentence overview of the document.",
        },
      },
      required: ["title", "formattedContent"],
    },
  };

  const tryGenerate = async (model: string) => {
    return await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: requestConfig,
    });
  };

  let response;
  try {
    response = await tryGenerate("gemini-3.8-flash");
  } catch (err: any) {
    console.warn("gemini-3.8-flash failed in formatting, retrying with gemini-flash-latest:", err?.message);
    try {
      response = await tryGenerate("gemini-flash-latest");
    } catch (err2: any) {
      console.warn("gemini-flash-latest failed in formatting, retrying with gemini-3.1-flash-lite:", err2?.message);
      response = await tryGenerate("gemini-3.1-flash-lite");
    }
  }

  const rawText = response.text?.trim() || "";
  try {
    const parsed = JSON.parse(rawText) as CleanAndFormatResult;
    return {
      title: parsed.title || `${template || 'Document'} - ${new Date().toLocaleDateString()}`,
      formattedContent: parsed.formattedContent || transcript,
      summary: parsed.summary || "",
    };
  } catch {
    // If output had markdown json wrapper
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]) as CleanAndFormatResult;
        return {
          title: parsed.title || `${template || 'Document'} - ${new Date().toLocaleDateString()}`,
          formattedContent: parsed.formattedContent || transcript,
          summary: parsed.summary || "",
        };
      } catch {}
    }
    return {
      title: `${template || 'VoiceDoc'} - ${new Date().toLocaleDateString()}`,
      formattedContent: rawText || transcript,
      summary: "",
    };
  }
}

export async function transcribeAudioData(params: {
  audioBase64: string;
  mimeType: string;
  languageHint?: string;
}): Promise<{ transcript: string; model: string }> {
  const { audioBase64, mimeType } = params;
  if (!audioBase64) {
    throw new Error("No audio payload provided.");
  }

  const ai = getAiClient();
  // Strip codec parameters like ;codecs=opus to leave valid IANA mime type: audio/webm, audio/mp4, audio/wav
  let cleanMimeType = (mimeType || "audio/webm").split(';')[0].trim().toLowerCase();
  if (cleanMimeType.startsWith('video/')) {
    cleanMimeType = cleanMimeType.replace('video/', 'audio/');
  }
  if (!cleanMimeType || cleanMimeType === 'audio/*') {
    cleanMimeType = 'audio/webm';
  }

  const prompt = "Transcribe all spoken words in this audio verbatim into clear text. Accurately transcribe English, Nigerian Pidgin, Igbo, and regional dialects. Return only the transcription text with correct punctuation, no introductory or concluding chatter.";

  const audioPart = {
    inlineData: {
      mimeType: cleanMimeType,
      data: audioBase64,
    },
  };

  const doTranscribe = async (model: string): Promise<string> => {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [audioPart, { text: prompt }],
      },
    });
    return extractTranscriptFromResponse(response);
  };

  let modelUsed = "gemini-3.5-transcribe";
  let text = "";

  try {
    text = await doTranscribe("gemini-3.5-transcribe");
  } catch (err: any) {
    console.warn("gemini-3.5-transcribe attempt failed:", err?.message || err);
    text = "";
  }

  // If primary transcribe returned empty text or failed, fall back to gemini-flash-latest and then gemini-3.1-flash-lite
  if (!text || text.trim().length === 0) {
    console.log("Retrying transcription with gemini-flash-latest fallback...");
    try {
      text = await doTranscribe("gemini-flash-latest");
      modelUsed = "gemini-flash-latest";
    } catch (fallbackErr: any) {
      console.warn("gemini-flash-latest fallback failed, retrying with gemini-3.1-flash-lite:", fallbackErr?.message || fallbackErr);
      try {
        text = await doTranscribe("gemini-3.1-flash-lite");
        modelUsed = "gemini-3.1-flash-lite";
      } catch (lastErr: any) {
        console.error("All transcription model attempts failed:", lastErr?.message || lastErr);
        throw lastErr;
      }
    }
  }

  return { transcript: text.trim(), model: modelUsed };
}
