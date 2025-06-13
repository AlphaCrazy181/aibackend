import { execCommand } from "../utils/files.mjs";
import path from "path";
import process from "process";
import fs from "fs";

const getPhonemes = async ({ message }) => {
  try {
    const time = new Date().getTime();
    console.log(`Starting conversion for message ${message}`);
    await execCommand(
      { command: `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav` }
    );
    console.log(`Conversion done in ${new Date().getTime() - time}ms`);

    // Determine the absolute path to the backend directory
    // This assumes the script is run from the 'backend' directory or its parent 'apps'
    const backendDir = process.cwd(); // This should be D:\talking-avatar-with-ai\apps\backend

    // Dynamically determine Rhubarb executable path based on OS
    const rhubarbExecutable = process.platform === "win32" ? "rhubarb.exe" : "rhubarb";
    const rhubarbBinPath = path.join(backendDir, "bin"); // Path to the bin directory
    const rhubarbFullPath = path.join(rhubarbBinPath, rhubarbExecutable); // Full path to the executable

    // Check if the rhubarb executable exists
    if (!fs.existsSync(rhubarbFullPath)) {
      throw new Error(`Rhubarb executable not found at: ${rhubarbFullPath}. Please ensure it's downloaded and placed in the 'backend/bin/' directory.`);
    }

    // NEW: Add a check for the Rhubarb resource files
    const rhubarbResPath = path.join(rhubarbBinPath, "res", "sphinx", "cmudict-en-us.dict");
    if (!fs.existsSync(rhubarbResPath)) {
      throw new Error(`Rhubarb resource files not found. Expected: ${rhubarbResPath}. Please download the FULL Rhubarb release (not just the .exe) and extract its contents into 'backend/bin/'.`);
    }

    await execCommand({
      command: `${rhubarbFullPath} -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`,
    });
    console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
  } catch (error) {
    console.error(`Error while getting phonemes for message ${message}:`, error);
  }
};

export { getPhonemes };
