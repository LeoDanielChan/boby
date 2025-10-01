/* eslint-disable padded-blocks */
/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable require-jsdoc */

const sendWhatsAppMessage = require("./sendMessage.js").sendWhatsAppMessage;
const getGeminiResponse = require("./geminiResponse.js").getGeminiResponse;
const createFullPrompt = require("./createPromt.js").createFullPrompt;
const downloadAndEncodeImage = require("./mediaHandler.js").downloadAndEncodeImage;
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore(undefined, "boby-store");

async function handleIncomingMessage(senderId, message, businessPhoneId) {
  const messageType = message.type;
  let userPrompt = "";
  let responseText = "Lo siento, Boby no pudo procesar tu solicitud.";
  let imagePart = null;

  const chatRef = db.collection("chats").doc(senderId);
  const chatDoc = await chatRef.get();
  const chatHistory = chatDoc.exists ? chatDoc.data().history || [] : [];

  console.log(`Tipo de mensaje recibido: ${messageType}`);


  if (messageType === "text") {
    userPrompt = message.text.body;
  } else if (messageType === "image") {
    console.log("Mensaje de imagen recibido:", message);
    const mediaId = message.image.id;
    try {
        console.log(`Descargando y codificando imagen con ID: ${mediaId}...`);
        imagePart = await downloadAndEncodeImage(mediaId);
        userPrompt = `El usuario ha enviado una imagen para identificar la pieza y cotizar. IDENTIFICA la pieza y genera una cotización clara de precios estimados.`;
    } catch (error) {
        console.error("Fallo crítico al manejar la imagen:", error);
        responseText = "Lo siento, Boby tuvo un problema técnico al descargar la imagen. Por favor, intenta enviarla de nuevo.";
        await sendWhatsAppMessage(senderId, responseText, businessPhoneId);
        return;
    }
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

  if (userPrompt) {
    const fullPrompt = createFullPrompt(chatHistory, userPrompt, imagePart);
    console.log(`Prompt del usuario: ${fullPrompt}`);
    responseText = await getGeminiResponse(fullPrompt);
  }

  await sendWhatsAppMessage(senderId, responseText, businessPhoneId);

  const newHistory = [
    ...chatHistory,
    {role: "user", text: userPrompt, timestamp: new Date()},
    {role: "agent", text: responseText, timestamp: new Date()},
  ].slice(-10);

  await chatRef.set(
    {
      history: newHistory,
    },
    {merge: true},
  );
}

module.exports = {handleIncomingMessage};

