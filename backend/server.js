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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// THIS PART SOLVES THE ISSUE
app.use(cors({
  origin: ["https://demofrontend-rose.vercel.app"],
  methods: ["GET", "POST", "OPTIONS"],
}));

const port = process.env.PORT || 3000;

const chatHistory = [];

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

app.post("/tts", async (req, res) => {
  const userMessageText = req.body.message;
  const userEmotion = req.body.emotion;
  const selectedVoiceId = req.body.voiceId;

  const defaultMessages = await sendDefaultMessages({ userMessage: userMessageText });
  if (defaultMessages) {
    res.send({ messages: defaultMessages });
    return;
  }

  let openAImessages;
  let analysisResult = null;
  try {
    const aiResponse = await invokeOpenAIChain({
      question: userMessageText,
      emotion: userEmotion,
    });
    openAImessages = aiResponse.messages;
    analysisResult = aiResponse.analysis;

    chatHistory.push({ type: "user", text: userMessageText, analysis: analysisResult, emotion: userEmotion });
    chatHistory.push({ type: "ai", messages: openAImessages });
  } catch (error) {
    console.error("Error invoking OpenAI chain:", error);
    openAImessages = defaultResponse;
    chatHistory.push({ type: "user", text: userMessageText, analysis: null, emotion: userEmotion });
    chatHistory.push({ type: "ai", messages: defaultResponse });
  }

  const lipSyncedMessages = await lipSync({ messages: openAImessages, voiceId: selectedVoiceId });
  res.send({ messages: lipSyncedMessages, analysis: analysisResult });
});

app.post("/sts", async (req, res) => {
  const base64Audio = req.body.audio;
  const userEmotion = req.body.emotion;
  const selectedVoiceId = req.body.voiceId;

  const audioData = Buffer.from(base64Audio, "base64");
  const userMessageText = await convertAudioToText({ audioData });

  let openAImessages;
  let analysisResult = null;
  try {
    const aiResponse = await invokeOpenAIChain({
      question: userMessageText,
      emotion: userEmotion,
    });
    openAImessages = aiResponse.messages;
    analysisResult = aiResponse.analysis;

    chatHistory.push({ type: "user", text: userMessageText, analysis: analysisResult, emotion: userEmotion });
    chatHistory.push({ type: "ai", messages: openAImessages });
  } catch (error) {
    console.error("Error invoking OpenAI chain:", error);
    openAImessages = defaultResponse;
    chatHistory.push({ type: "user", text: userMessageText, analysis: null, emotion: userEmotion });
    chatHistory.push({ type: "ai", messages: defaultResponse });
  }

  const lipSyncedMessages = await lipSync({ messages: openAImessages, voiceId: selectedVoiceId });
  res.send({ messages: lipSyncedMessages, analysis: analysisResult, userMessageText });
});

app.get("/chat-history", (req, res) => {
  res.send({ history: chatHistory });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
