import ElevenLabs from "elevenlabs-node";
import dotenv from "dotenv";
dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const modelID = process.env.ELEVEN_LABS_MODEL_ID;

// This instance is ONLY for the /voices endpoint, not for textToSpeech conversion
const voicesApiInstance = new ElevenLabs({ apiKey: elevenLabsApiKey });

async function convertTextToSpeech({ text, fileName, voiceId }) {
  console.log("convertTextToSpeech using voiceId:", voiceId);

  // Create a new ElevenLabs instance for each text-to-speech call
  // This ensures that the voiceId is always fresh and not influenced by previous states
  const voiceClient = new ElevenLabs({
    apiKey: elevenLabsApiKey,
  });

  try {
    await voiceClient.textToSpeech({
      fileName: fileName,
      textInput: text,
      voiceId: voiceId, // Use the dynamically passed voiceId here
      stability: 0.5,
      similarityBoost: 0.5,
      modelId: modelID,
      style: 1,
      speakerBoost: true,
    });
  } catch (error) {
    // Log the full error response from ElevenLabs if available
    console.error(`Error in ElevenLabs API call for voiceId ${voiceId}:`, error.response ? error.response.data : error.message);
    throw error; // Re-throw to be caught by lipSync for retry logic
  }
}

// Export convertTextToSpeech and the specific instance for /voices endpoint
export { convertTextToSpeech, voicesApiInstance as voice };
