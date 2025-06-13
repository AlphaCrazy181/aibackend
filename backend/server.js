import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { invokeOpenAIChain } from "./modules/openAI.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";
import * as voice from "./modules/elevenLabs.mjs";

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const app = express();

// ——————————
// CORS SETUP
// ——————————
const allowedOrigins = [
  "https://aifrontend-zeta.vercel.app",
  "https://demofrontend-rose.vercel.app"
];
const corsOptions = {
  origin(origin, callback) {
    // allow non-browser (postman, curl) requests
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

// Apply to all routes
app.use(cors(corsOptions));
// Preflight
app.options("*", cors(corsOptions));

// ——————————
// BODY PARSING
// ——————————
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ——————————
// ROUTES
// ——————————
const chatHistory = [];

app.get("/voices", async (req, res) => {
  const voices = await voice.getVoices(elevenLabsApiKey);
  res.send(voices);
});

app.post("/tts", async (req, res) => {
  const { message: userMessageText, emotion: userEmotion, voiceId: selectedVoiceId } = req.body;
  console.log("Server /tts received voiceId:", selectedVoiceId);

  const defaultMessages = await sendDefaultMessages({ userMessage: userMessageText });
  if (defaultMessages) {
    return res.send({ messages: defaultMessages });
  }

  let openAImessages, analysisResult = null;
  try {
    const aiResponse = await invokeOpenAIChain({ question: userMessageText, emotion: userEmotion });
    openAImessages = aiResponse.messages;
    analysisResult = aiResponse.analysis;
  } catch (error) {
    console.error("Error invoking OpenAI chain:", error);
    openAImessages = defaultResponse;
  }

  chatHistory.push({ type: "user", text: userMessageText, analysis: analysisResult, emotion: userEmotion });
  chatHistory.push({ type: "ai", messages: openAImessages });

  const lipSyncedMessages = await lipSync({ messages: openAImessages, voiceId: selectedVoiceId });
  res.send({ messages: lipSyncedMessages, analysis: analysisResult });
});

app.post("/sts", async (req, res) => {
  const { audio: base64Audio, emotion: userEmotion, voiceId: selectedVoiceId } = req.body;
  console.log("Server /sts received voiceId:", selectedVoiceId);

  const audioData = Buffer.from(base64Audio, "base64");
  const userMessageText = await convertAudioToText({ audioData });

  let openAImessages, analysisResult = null;
  try {
    const aiResponse = await invokeOpenAIChain({ question: userMessageText, emotion: userEmotion });
    openAImessages = aiResponse.messages;
    analysisResult = aiResponse.analysis;
  } catch (error) {
    console.error("Error invoking OpenAI chain:", error);
    openAImessages = defaultResponse;
  }

  chatHistory.push({ type: "user", text: userMessageText, analysis: analysisResult, emotion: userEmotion });
  chatHistory.push({ type: "ai", messages: openAImessages });

  const lipSyncedMessages = await lipSync({ messages: openAImessages, voiceId: selectedVoiceId });
  res.send({ messages: lipSyncedMessages, analysis: analysisResult, userMessageText });
});

app.get("/chat-history", (req, res) => {
  res.send({ history: chatHistory });
});

// ——————————
// LOCAL DEVELOPMENT
// ——————————
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Jack is listening locally on port ${port}`);
  });
}

// ——————————
// VERCEL ENTRYPOINT
// ——————————
export default app;
