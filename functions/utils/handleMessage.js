/* eslint-disable padded-blocks */
/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable require-jsdoc */

const sendWhatsAppMessage = require("./sendMessage.js").sendWhatsAppMessage;
const {sessionManager} = require("./geminiSessionManager.js");
const downloadAndEncodeImage = require("./mediaHandler.js").downloadAndEncodeImage;
const transcribeWhatsAppAudio = require("./audioHandler.js").transcribeWhatsAppAudio;

async function handleIncomingMessage(senderId, message, businessPhoneId) {
  const messageType = message.type;
  let userPrompt = "";
  let responseText = "Lo siento, Boby no pudo procesar tu solicitud.";
  let imagePart = null;

  console.log(`Tipo de mensaje recibido: ${messageType}`);

  if (messageType === "text") {
    userPrompt = message.text.body;

  } else if (messageType === "image") {
    console.log("Mensaje de imagen recibido:", message);
    const mediaId = message.image.id;
    try {
      console.log(`Descargando y codificando imagen con ID: ${mediaId}...`);
      imagePart = await downloadAndEncodeImage(mediaId);
      userPrompt = "Analiza esta imagen y ayúdame a identificar la pieza automotriz. Si puedes reconocerla, proporciona una cotización estimada.";
    } catch (error) {
      console.error("Fallo crítico al manejar la imagen:", error);
      responseText = "Lo siento, tuve un problema técnico al descargar la imagen. Por favor, intenta enviarla de nuevo.";
      await sendWhatsAppMessage(senderId, responseText, businessPhoneId);
      return;
    }

  } else if (messageType === "audio") {
    const mediaId = message.audio.id;
    try {
      const audioText = await transcribeWhatsAppAudio(mediaId);
      userPrompt = `Transcripción del audio: "${audioText}"`;
    } catch (error) {
      console.error("Fallo crítico al manejar el audio:", error);
      responseText = "Lo siento, tuve un problema técnico al transcribir el audio. Por favor, intenta de nuevo o envía un texto.";
      await sendWhatsAppMessage(senderId, responseText, businessPhoneId);
      return;
    }

  } else {
    responseText = "Solo puedo procesar mensajes de texto, imágenes y audio.";
    await sendWhatsAppMessage(senderId, responseText, businessPhoneId);
    return;
  }

  if (userPrompt) {
    try {
      console.log(`Usuario ${senderId}: ${userPrompt}`);

      responseText = await sessionManager.sendMessage(senderId, userPrompt, imagePart);

      console.log(`Respuesta de Boby: ${responseText}`);
    } catch (error) {
      console.error("Error al obtener respuesta de Gemini:", error);
      responseText = "Disculpa, tuve un problema técnico. ¿Podrías repetir tu consulta?";
    }
  }

  await sendWhatsAppMessage(senderId, responseText, businessPhoneId);
}

module.exports = {handleIncomingMessage};

