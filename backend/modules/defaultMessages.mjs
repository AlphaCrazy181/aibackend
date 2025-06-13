import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Convert ES module URL to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Reads an audio file and returns it as a base64-encoded string.
 * @param {Object} params
 * @param {string} params.fileName - e.g., "audios/intro_0.wav"
 * @returns {Promise<string>} base64 encoded audio
 */
async function audioFileToBase64({ fileName }) {
  const fileBase = fileName.split("/").pop(); // Get just the filename
  const fullPath = join(__dirname, "../audios", fileBase);
  const data = await readFile(fullPath);
  return Buffer.from(data).toString("base64");
}

/**
 * Reads a JSON transcript and returns it as a JavaScript object.
 * @param {Object} params
 * @param {string} params.fileName - e.g., "audios/intro_0.json"
 * @returns {Promise<Object>} parsed JSON
 */
async function readJsonTranscript({ fileName }) {
  const fileBase = fileName.split("/").pop();
  const fullPath = join(__dirname, "../audios", fileBase);
  const data = await readFile(fullPath, "utf-8");
  return JSON.parse(data);
}

// ✅ Export both functions
export { audioFileToBase64, readJsonTranscript };
