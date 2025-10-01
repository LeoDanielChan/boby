/* eslint-disable max-len */
const GoogleGenAI = require("@google/genai").GoogleGenAI;
const REGION = "us-central1";
const PROJECT_ID = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : null;

console.log("GCP Project ID:", PROJECT_ID);
const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: REGION,
});

const model = "gemini-2.5-flash";

// eslint-disable-next-line require-jsdoc
async function getGeminiResponse(fullPrompt) {
  const contents = fullPrompt;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
    });

    const responseText = response.text;

    return responseText.trim();
  } catch (error) {
    console.error("Error al conectar con Gemini (Vertex AI):", error);
    return "Lo siento, hubo un error técnico al buscar los precios. Por favor, intenta de nuevo.";
  }
}

module.exports = {getGeminiResponse};
