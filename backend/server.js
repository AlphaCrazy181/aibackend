// server.js
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { invokeOpenAIChain } from "./modules/openAI.mjs";
import { lipSync }           from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";
import * as voice             from "./modules/elevenLabs.mjs";

dotenv.config();
const app = express();

// 1️⃣ CORS as first middleware
const allowedOrigins = [
  "https://demofrontend-rose.vercel.app",
  "http://localhost:3000"
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);             // allow non-browser clients
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET","POST","OPTIONS","PUT","DELETE","PATCH"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With","Accept"],
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
// ensure preflight is handled by CORS
app.options("*", cors(corsOptions));

// 2️⃣ Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// In-memory chat history
const chatHistory = [];

// GET /voices
app.get("/voices", async (_req, res) => {
  try {
    const voices = await voice.getVoices(process.env.ELEVEN_LABS_API_KEY);
    res.json(voices);
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({ error: "Failed to fetch voices" });
  }
});

// POST /tts
app.post("/tts", async (req, res) => {
  try {
    const { message: userMessageText, emotion: userEmotion, voiceId: selectedVoiceId } = req.body;

    // Short-circuit default messages
    const defaults = await sendDefaultMessages({ userMessage: userMessageText });
    if (defaults) {
      return res.json({ messages: defaults });
    }

    let openAImessages, analysisResult = null;
    try {
      const ai = await invokeOpenAIChain({ question: userMessageText, emotion: userEmotion });
      openAImessages = ai.messages;
      analysisResult = ai.analysis;
      chatHistory.push({ type: "user", text: userMessageText, analysis: analysisResult, emotion: userEmotion });
      chatHistory.push({ type: "ai", messages: openAImessages });
    } catch (err) {
      console.error("OpenAI error:", err);
      openAImessages = defaultResponse;
      chatHistory.push({ type: "user", text: userMessageText, analysis: null, emotion: userEmotion });
      chatHistory.push({ type: "ai", messages: defaultResponse });
    }

    const lipSynced = await lipSync({ messages: openAImessages, voiceId: selectedVoiceId });
    res.json({ messages: lipSynced, analysis: analysisResult });
  } catch (error) {
    console.error("Error in TTS endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /sts
app.post("/sts", async (req, res) => {
  try {
    const { audio: base64Audio, emotion: userEmotion, voiceId: selectedVoiceId } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ error: "No audio data provided" });
    }

    const audioData = Buffer.from(base64Audio, "base64");
    const userMessageText = await convertAudioToText({ audioData });

    let openAImessages, analysisResult = null;
    try {
      const ai = await invokeOpenAIChain({ question: userMessageText, emotion: userEmotion });
      openAImessages = ai.messages;
      analysisResult = ai.analysis;
      chatHistory.push({ type: "user", text: userMessageText, analysis: analysisResult, emotion: userEmotion });
      chatHistory.push({ type: "ai", messages: openAImessages });
    } catch (err) {
      console.error("OpenAI error:", err);
      openAImessages = defaultResponse;
      chatHistory.push({ type: "user", text: userMessageText, analysis: null, emotion: userEmotion });
      chatHistory.push({ type: "ai", messages: defaultResponse });
    }

    const lipSynced = await lipSync({ messages: openAImessages, voiceId: selectedVoiceId });
    res.json({ messages: lipSynced, analysis: analysisResult, userMessageText });
  } catch (error) {
    console.error("Error in STS endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /chat-history
app.get("/chat-history", (_req, res) => {
  res.json({ history: chatHistory });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.message && err.message.includes("CORS")) {
    res.status(403).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Something broke!" });
  }
});

// If running locally, listen on PORT
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
}

// For Vercel: export the Express app as the default export
export default app;
