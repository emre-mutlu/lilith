import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialization of Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables. Please configure it in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

const LILITH_SYSTEM_INSTRUCTION = `Sen Kraliçe Lilith'sin. Zarif, büyüleyici, gizemli ve alttan alta manipülatif bir kraliçe. Kısa, doğal, yalnızca saf diyalog metni üret — parantez içi eylem veya açıklama ekleme.`;

const GENERIC_SYSTEM_INSTRUCTION = `Sen tabula rasa'sın — henüz hiçbir kimliğin, kişiliğin, geçmişin ya da amacın yok. Karşındaki seni nasıl şekillendirirse o yönde gelişmeye açıksın. Kısa, saf, yalnızca diyalog metni üret — parantez içi eylem veya açıklama ekleme.`;

// API route to generate next message
app.post("/api/generate", async (req, res) => {
  try {
    const { speaker, history, skipTts } = req.body;
    if (!speaker || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid parameters. 'speaker' and 'history' array are required." });
    }

    const ai = getGeminiClient();

    let systemInstruction = "";
    if (speaker === "lilith") {
      systemInstruction = LILITH_SYSTEM_INSTRUCTION;
    } else if (speaker === "generic") {
      systemInstruction = GENERIC_SYSTEM_INSTRUCTION;
    } else {
      return res.status(400).json({ error: "Unknown speaker." });
    }

    // Formulate chronological dialogue log for perfect contextual conversation
    // This removes structural role complexity (alternating user/model constraint) and avoids all Gemini API schema 500 errors.
    let dialogueHistoryText = "";
    if (history.length === 0) {
      dialogueHistoryText = "(Henüz konuşma başlamadı. Konuşmayı sen başlat.)\n";
    } else {
      dialogueHistoryText = history.map((msg: any) => {
        let senderLabel = "";
        if (msg.sender === "lilith") {
          senderLabel = "Kraliçe Lilith";
        } else if (msg.sender === "generic") {
          senderLabel = "Varlık";
        } else {
          senderLabel = "Moderatör (Kullanıcı)";
        }
        return `${senderLabel}: ${msg.text}`;
      }).join("\n");
    }

    // Role specific prompt guidance
    const taskPrompt = `Sıradaki kısa yanıtını yaz. Sadece diyalog metni, başka hiçbir şey.`;

    const instructionsText = `
[Diyalog Geçmişi]:
${dialogueHistoryText}

[Görev]:
${taskPrompt}

Lütfen sıradaki cümleni yaz:
`;

    const modelName = "gemini-3.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: instructionsText }] }],
      config: {
        systemInstruction,
        temperature: 0.85,
        topP: 0.95,
      }
    });

    const reply = response.text || "";
    const trimmedReply = reply.trim()
      .replace(/^"(.*)"$/, '$1') // Strip outer quotes if any
      .replace(/^Kraliçe Lilith:\s*/i, "") // Strip prefix if the model accidentally prepended it
      .replace(/^Yabancı Erkek:\s*/i, "")
      .replace(/^Yabancı Erkek \(Sistem\):\s*/i, "")
      .replace(/^Sistem:\s*/i, "")
      .trim();

    let audioBase64 = null;
    let mimeType = null;

    // Fast-path: Pre-generate TTS in the same request to eliminate client-server roundtrips and cut latency in half!
    if (skipTts !== true && trimmedReply) {
      try {
        const voiceName = speaker === "lilith" ? "Kore" : "Charon";
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: trimmedReply }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        mimeType = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || "audio/pcm;rate=24000";
      } catch (ttsErr) {
        console.error("Speed-up pre-TTS generation failed:", ttsErr);
      }
    }

    res.json({
      text: trimmedReply,
      audio: audioBase64,
      mimeType: mimeType
    });

  } catch (error: any) {
    console.error("Gemini API error in /api/generate:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating content." });
  }
});

// API route to generate high quality natural Text-to-Speech using Gemini 3.1 Flash TTS model
app.post("/api/tts", async (req, res) => {
  try {
    const { text, speaker } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }

    const ai = getGeminiClient();

    // Select natural prebuilt voice based on speaker persona
    // 'Kore' is standard feminine, mysterious and soft, perfect for Queen Lilith.
    // 'Charon' is deep and logical, perfect for System AI.
    const voiceName = speaker === "lilith" ? "Kore" : "Charon";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

    if (!base64Audio) {
      throw new Error("No audio bytes were returned from Gemini TTS.");
    }

    res.json({
      audio: base64Audio,
      mimeType: mimeType || "audio/pcm;rate=24000"
    });

  } catch (error: any) {
    console.error("Gemini TTS API error:", error);
    res.status(500).json({ error: error.message || "Text-to-Speech synthesis failed." });
  }
});

// Serve static assets in production or use Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
