/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
// utils/createPromt.js (Vertex AI Optimized Version)

function createFullPrompt(history, newPrompt, imagePart = null) {
  const chatHistoryFormatted = history.map((item) => ({
    role: item.role === "agent" ? "model" : "user",
    parts: [{text: item.text}],
  }));

  const systemText =
    "Eres Boby, un agente de IA experto en piezas de vehículos. " +
    "Tu trabajo es identificar piezas, recomendar productos de mantenimiento " +
    "y cotizar precios estimados. Siempre usa el historial para recordar el modelo " +
    "del auto o cotizaciones previas." +
    "**IMPORTANTE: Mantén las cotizaciones y explicaciones concisas, con un máximo de 3000 caracteres.**";

  const userParts = [];

  if (imagePart) {
    userParts.push({
      inlineData: {
        mimeType: imagePart.mimeType,
        data: imagePart.base64Image,
      },
    });
  }

  userParts.push({text: `${systemText}\n\n${newPrompt}`});

  const newPromptFormatted = {
    role: "user",
    parts: userParts,
  };

  return [...chatHistoryFormatted, newPromptFormatted];
}

module.exports = {createFullPrompt};
