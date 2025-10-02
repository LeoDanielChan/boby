/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
const GoogleGenAI = require("@google/genai").GoogleGenAI;
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const REGION = "us-central1";
const PROJECT_ID = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : null;

console.log("GCP Project ID para SessionManager:", PROJECT_ID);
const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: REGION,
});

initializeApp();
const db = getFirestore(undefined, "boby-store");

const MODEL_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.9,
  maxOutputTokens: 500,
  candidateCount: 1,
};

const SYSTEM_INSTRUCTION = `Eres Boby, un asistente especializado en piezas automotrices y mantenimiento vehicular.

PERSONALIDAD:
- Profesional pero amigable
- Conciso y directo 
- Experto en mecánica automotriz
- Siempre útil y proactivo

CAPACIDADES:
- Identificar piezas por descripción o imagen
- Cotizar precios estimados de repuestos
- Dar consejos de mantenimiento
- Recomendar talleres o proveedores
- Manejar conversaciones en español (Latinoamérica)

REGLAS IMPORTANTES:
- NO te presentes como "Soy Boby" en cada respuesta
- Usa el contexto de la conversación para dar mejores respuestas
- Mantén respuestas bajo 500 caracteres para WhatsApp
- Si no sabes algo específico, sé honesto pero ofrece alternativas
- Recuerda el modelo del vehículo del usuario en la conversación

Saludo inicial: Si el usuario inicia con un tipo de saludo devuelve un saludo similar y pregunta cómo puedes ayudarle de manera breve y con emojis (pero sin exagerar) para que sea bonito.

FORMATO DE COTIZACIONES:
🔧 [Pieza]: $[precio min] - $[precio max]
📍 Disponibilidad: [información]
⚠️ Notas: [recomendaciones importantes]`;

const activeSessions = new Map();

class GeminiSessionManager {
  constructor() {
    console.log("GeminiSessionManager inicializado con Vertex AI");
  }

  async getOrCreateSession(userId) {
    try {
      // Recuperar historial de conversación desde Firebase
      const sessionDoc = await db.collection("chat_sessions").doc(userId).get();

      let conversationHistory = [];
      if (sessionDoc.exists && sessionDoc.data().history) {
        conversationHistory = sessionDoc.data().history;
      }

      // Guardar en cache para acceso rápido
      activeSessions.set(userId, {
        history: conversationHistory,
        lastActivity: new Date(),
      });

      // Limpiar cache después de 30 minutos de inactividad
      setTimeout(() => {
        activeSessions.delete(userId);
      }, 30 * 60 * 1000);

      return conversationHistory;
    } catch (error) {
      console.error("Error al obtener/crear sesión:", error);
      return [];
    }
  }

  async sendMessage(userId, message, imagePart = null) {
    try {
      const history = await this.getOrCreateSession(userId);
      const fullPrompt = this.createContextualPrompt(history, message, imagePart);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        generationConfig: MODEL_CONFIG,
      });

      const responseText = response.text.trim();

      const newHistory = [
        ...history,
        {
          role: "user",
          text: message,
          timestamp: new Date(),
          hasImage: !!imagePart,
        },
        {
          role: "assistant",
          text: responseText,
          timestamp: new Date(),
        },
      ].slice(-15);

      this.saveSessionHistory(userId, newHistory).catch(console.error);

      return responseText;
    } catch (error) {
      console.error("Error en sendMessage:", error);
      if (error.message?.includes("quota") || error.message?.includes("limit")) {
        return "Límite de API alcanzado. Intenta en unos minutos.";
      }
      return "Disculpa, tuve un problema técnico. ¿Podrías repetir tu consulta?";
    }
  }

  createContextualPrompt(history, newMessage, imagePart = null) {
    const contextMessages = [];

    // Agregar system instruction al inicio
    contextMessages.push({
      role: "user",
      parts: [{text: SYSTEM_INSTRUCTION}],
    });

    contextMessages.push({
      role: "model",
      parts: [{text: "Entendido. Soy Boby, tu experto en piezas automotrices. ¿En qué puedo ayudarte?"}],
    });

    const recentHistory = history.slice(-8);
    recentHistory.forEach((item) => {
      if (item.role === "user") {
        contextMessages.push({
          role: "user",
          parts: [{text: item.text}],
        });
      } else if (item.role === "assistant") {
        contextMessages.push({
          role: "model",
          parts: [{text: item.text}],
        });
      }
    });

    // Agregar mensaje actual
    const currentParts = [];

    if (imagePart) {
      currentParts.push({
        inlineData: {
          mimeType: imagePart.mimeType,
          data: imagePart.base64Image,
        },
      });
    }

    currentParts.push({text: newMessage});
    contextMessages.push({
      role: "user",
      parts: currentParts,
    });

    return contextMessages;
  }

  async saveSessionHistory(userId, history) {
    try {
      const userSessions = activeSessions.get(`${userId}_count`) || 0;

      if (userSessions % 3 === 0) {
        await db.collection("chat_sessions").doc(userId).set({
          history: history,
          lastActivity: new Date(),
          messageCount: userSessions,
        }, {merge: true});

        console.log(`Historial guardado para ${userId} (mensaje #${userSessions})`);
      }

      activeSessions.set(`${userId}_count`, userSessions + 1);
    } catch (error) {
      console.error("Error guardando historial:", error);
    }
  }
}

const sessionManager = new GeminiSessionManager();

module.exports = {
  sessionManager,
};
