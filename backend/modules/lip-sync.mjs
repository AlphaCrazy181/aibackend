import { convertTextToSpeech } from "./elevenLabs.mjs";
import { getPhonemes } from "./rhubarbLipSync.mjs";
import { readJsonTranscript, audioFileToBase64 } from "../utils/files.mjs";

const MAX_RETRIES = 10;
const RETRY_DELAY = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lipSync = async ({ messages, voiceId }) => {
  console.log("lipSync received voiceId:", voiceId); // LOG HERE
  await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `audios/message_${index}.mp3`;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await convertTextToSpeech({ text: message.text, fileName, voiceId });
          await delay(RETRY_DELAY);
          break;
        } catch (error) {
          if (error.response && error.response.status === 429 && attempt < MAX_RETRIES - 1) {
            console.warn(`ElevenLabs rate limit hit, retrying... (Attempt ${attempt + 1}/${MAX_RETRIES})`); // LOG HERE
            await delay(RETRY_DELAY);
          } else {
            console.error(`Error converting text to speech for message ${index} with voiceId ${voiceId}:`, error.response ? error.response.data : error.message); // LOG HERE
            throw error;
          }
        }
      }
      console.log(`Message ${index} converted to speech`);
    })
  );

  await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `audios/message_${index}.mp3`;

      try {
        await getPhonemes({ message: index });
        message.audio = await audioFileToBase64({ fileName });
        message.lipsync = await readJsonTranscript({ fileName: `audios/message_${index}.json` });
      } catch (error) {
        console.error(`Error while getting phonemes for message ${index}:`, error);
      }
    })
  );

  return messages;
};

export { lipSync };
