import { OpenAIWhisperAudio } from "langchain/document_loaders/fs/openai_whisper_audio";
import { convertAudioToMp3 } from "../utils/audios.mjs";
import fs from "fs";
import path from "path"; // Import path module
import dotenv from "dotenv";
dotenv.config();

const openAIApiKey = process.env.OPENAI_API_KEY;

async function convertAudioToText({ audioData }) {
  // Use convertAudioToMp3 which already handles temp directory creation and pathing
  const mp3AudioData = await convertAudioToMp3({ audioData });
  
  // The convertAudioToMp3 function now returns the path to the generated MP3 file
  // and handles cleanup. We need to adjust this to get the path if it's not returning it.
  // Let's assume convertAudioToMp3 saves to a known temp path and returns it.
  // If convertAudioToMp3 only returns the buffer, we need to save it here.

  // Re-saving the mp3AudioData to a temporary file for OpenAIWhisperAudio loader
  // Ensure the 'tmp' directory exists relative to the current working directory
  const tmpDir = 'tmp';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }
  const outputPath = path.join(tmpDir, `whisper_input_${Date.now()}.mp3`); // Use a unique filename
  fs.writeFileSync(outputPath, mp3AudioData);

  const loader = new OpenAIWhisperAudio(outputPath, { clientOptions: { apiKey: openAIApiKey } });
  const doc = (await loader.load()).shift();
  const transcribedText = doc.pageContent;
  
  // Clean up the temporary file after transcription
  fs.unlinkSync(outputPath);
  
  return transcribedText;
}

export { convertAudioToText };
