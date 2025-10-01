/* eslint-disable require-jsdoc */
/* eslint-disable indent */
/* eslint-disable max-len */
// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {VERIFY_TOKEN} = require("./config.js");
const sendWhatsAppMessage = require("./utils/sendMessage.js").sendWhatsAppMessage;
const getGeminiResponse = require("./utils/geminiResponse.js").getGeminiResponse;
const createFullPrompt = require("./utils/createPromt.js").createFullPrompt;

admin.initializeApp();
// const db = admin.firestore();

// --- FUNCIÓN PRINCIPAL DE WEBHOOK ---
exports.whatsappWebhook = functions
  .https.onRequest(async (req, res) => {
    // A. VERIFICACIÓN DEL WEBHOOK (GET)
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      } else {
        return res
          .status(403)
          .send("Forbidden: Token de verificación incorrecto.");
      }
    }

    // B. MANEJO DE MENSAJES (POST)
    if (req.method === "POST") {
      const data = req.body;
      if (data.object === "whatsapp_business_account") {
        try {
          for (const entry of data.entry) {
            for (const change of entry.changes) {
              for (const message of change.value.messages || []) {
                const senderId = message.from;
                const businessPhoneId = change.value.metadata.phone_number_id;

                await handleIncomingMessage(senderId, message, businessPhoneId);
              }
            }
          }
          return res.status(200).send("EVENT_RECEIVED");
        } catch (error) {
          console.error("Error procesando el mensaje:", error);
          return res.status(200).send("EVENT_RECEIVED");
        }
      }
    }

    res.status(405).send("Method Not Allowed");
  });


// --- LÓGICA DEL AGENTE BOBY (MCP, GEMINI, MULTIMODAL) ---
async function handleIncomingMessage(senderId, message, businessPhoneId) {
  const messageType = message.type;
  let userPrompt = "";
  let responseText = "Lo siento, Boby no pudo procesar tu solicitud.";

  // 1. Manejo de Contexto (MCP - Lectura)
  // const chatRef = db.collection("chats").doc(senderId);
  // console.log(`Obteniendo historial para ${senderId}...`);
  // const chatDoc = await chatRef.get();
  // console.log(`Documento obtenido: ${chatDoc.exists}`);
  // const chatHistory = chatDoc.exists ? chatDoc.data().history || [] : [];
  // console.log(`Historial actual para ${senderId}:`, chatHistory);

  // 2. Procesamiento de Mensajes (Multimodal)
  if (messageType === "text") {
    // Ejemplo: "Quiero el mantenimiento para un Chevrolet Spark 2020."
    userPrompt = message.text.body;
  } else if (messageType === "image") {
    // Ejemplo: El usuario envía una foto de un caliper.
    // NOTA: Para producción, la imagen debe ser descargada y codificada en Base64 para Gemini.
    const mediaId = message.image.id;
    // Aquí le damos a Gemini el contexto de lo que debe hacer.
    userPrompt = `El usuario ha enviado una imagen (ID: ${mediaId}). IDENTIFICA la pieza (e.g., Caliper, Disco de Freno, etc.) y simula la búsqueda de PRECIOS estimados en diferentes tiendas online. Genera una cotización clara.`;
  } else if (messageType === "audio") {
    // Ejemplo: El usuario envía un audio pidiendo un "filtro de aceite".
    // NOTA: Para producción, necesitas un servicio Speech-to-Text (STT) como Google Cloud Speech.
    const mediaId = message.audio.id;
    userPrompt = `El usuario ha enviado un mensaje de voz (ID: ${mediaId}) con una solicitud de cotización. Usa tu función de búsqueda para identificar el producto y genera una cotización de precios estimados.`;
  } else {
    responseText = "Boby solo procesa mensajes de texto, imágenes y audio.";
    await sendWhatsAppMessage(senderId, responseText, businessPhoneId);
    return;
  }

  // 3. Conexión a Gemini (Vertex AI) con Contexto (MCP)
  if (userPrompt) {
    console.log(`Prompt del usuario: ${userPrompt}`);
    const fullPrompt = createFullPrompt([], userPrompt);
    responseText = await getGeminiResponse(fullPrompt);
  }

  // 4. Enviar Respuesta (WhatsApp)
  await sendWhatsAppMessage(senderId, responseText, businessPhoneId);

  // 5. Manejo de Contexto (MCP - Escritura)
  // Se guarda el intercambio para que la próxima consulta tenga contexto.
  // const newHistory = [
  //   ...chatHistory,
  //   {role: "user", text: userPrompt, timestamp: new Date()},
  //   {role: "agent", text: responseText, timestamp: new Date()},
  // ].slice(-10); // Limita el historial a las últimas 10 interacciones

  // await chatRef.set(
  //   {
  //     history: newHistory,
  //     lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
  //   },
  //   {merge: true},
  // );
}
