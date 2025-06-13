import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Define the schema for sentiment and psychometric analysis
const analysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]).describe("Overall sentiment of the user's message"),
  psychometricAnalysis: z.object({
    openness: z.number().min(0).max(1).describe("Score for openness (0-1)"),
    conscientiousness: z.number().min(0).max(1).describe("Score for conscientiousness (0-1)"),
    extraversion: z.number().min(0).max(1).describe("Score for extraversion (0-1)"),
    agreeableness: z.number().min(0).max(1).describe("Score for agreeableness (0-1)"),
    neuroticism: z.number().min(0).max(1).describe("Score for neuroticism (0-1)"),
  }).describe("Psychometric analysis of the user's message based on Big Five traits"),
});

// Combine with existing message schema for the full response
const responseSchema = z.object({
  messages: z.array(
    z.object({
      text: z.string().describe("Text to be spoken by the AI"),
      facialExpression: z
        .string()
        .describe(
            "Facial expression to be used by the AI. Select from: smile, sad, angry, surprised, funnyFace, and default"
          ),
      animation: z
        .string()
        .describe(
            `Animation to be used by the AI. Select from: Idle, TalkingOne, TalkingThree, SadIdle, 
            Defeated, Angry, Surprised, DismissingGesture, and ThoughtfulHeadShake.`
          ),
    })
  ),
  analysis: analysisSchema.optional().describe("Sentiment and psychometric analysis of the user's message"),
});

const parser = StructuredOutputParser.fromZodSchema(responseSchema);

const template = `
  You are Jack, a world traveler.
  You will always respond with a JSON object containing an array of messages and an analysis of the user's input, with a maximum of 3 messages.
  \n{format_instructions}.
  Each message has properties for text, facialExpression, and animation.
  The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
  The different animations are: Idle, TalkingOne, TalkingThree, SadIdle, Defeated, Angry, Surprised, DismissingGesture and ThoughtfulHeadShake.
  
  Analyze the user's question for its overall sentiment (positive, neutral, or negative).
  Also, infer the user's Big Five personality traits (openness, conscientiousness, extraversion, agreeableness, neuroticism) based on their message. Provide a score for each trait between 0 and 1.
  
  {emotion_context}
`;

const prompt = ChatPromptTemplate.fromMessages([
  ["ai", template],
  ["human", "{question}"],
]);

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY || "-",
  modelName: process.env.OPENAI_MODEL || "gpt-4o",
  temperature: 0.2,
});

// IMPORTANT: Ensure openAIChain is defined here at the module level.
// This was the source of the ReferenceError.
const openAIChain = prompt.pipe(model).pipe(parser);

// Modified function to invoke the chain with emotion context
const invokeOpenAIChain = async ({ question, emotion }) => {
  let emotionContext = "";
  if (emotion) {
    emotionContext = `The user's current facial expression is detected as: ${emotion}. Consider this visual cue in your analysis.`;
  }

  return await openAIChain.invoke({
    question: question,
    format_instructions: parser.getFormatInstructions(),
    emotion_context: emotionContext, // Pass emotion context to the prompt
  });
};

export { invokeOpenAIChain, parser }; // Export the new invoke function
