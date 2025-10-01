const GoogleGenAI = require("@google/genai").GoogleGenAI;
const {GEMINI_API_KEY} = require("../config.js");

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

// eslint-disable-next-line require-jsdoc
async function getGeminiResponse(fullPrompt) {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    console.log("Respuesta de Gemini:", result.text);

    return result.text.trim();
  } catch (error) {
    console.error("Error al conectar con Gemini:", error);
    // eslint-disable-next-line max-len
    return "Lo siento, hubo un error técnico al buscar los precios. Por favor, intenta de nuevo.";
  }
}

module.exports = {getGeminiResponse};
