import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { invokeOpenAIChain } from "./modules/openAI.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";
import * as voice from "./modules/elevenLabs.mjs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const ELEVEN_API_KEY = process.env.ELEVEN_LABS_API_KEY;

// Define your allowed origin
const allowedOrigins = ["https://demofrontend-rose.vercel.app"];

// CORS options
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

// 1) Global JSON/body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 2) CORS middleware
app.use(cors(corsOptions));

// 3) Preflight handler (short-circuit OPTIONS)
app.options("*", cors(corsOptions), (_req, res) => {
  // Immediately respond to preflight requests
  res.sendStatus(200);
});

// In-memory chat history
const chatHistory = [];

// GET /voices
app.get("/voices", async (_req, res) => {
  const voices = await voice.getVoices(ELEVEN_API_KEY);
  res.json(voices);
});

// POST /tts
app.post("/tts", async (req, res) => {
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
});

// POST /sts
app.post("/sts", async (req, res) => {
  const { audio: base64Audio, emotion: userEmotion, voiceId: selectedVoiceId } = req.body;
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
});

// GET /chat-history
app.get("/chat-history", (_req, res) => {
  res.json({ history: chatHistory });
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
