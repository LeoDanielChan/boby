/* eslint-disable arrow-parens */
/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable require-jsdoc */

const {SpeechClient} = require("@google-cloud/speech");
const WHATSAPP_TOKEN = require("../config.js").WHATSAPP_TOKEN;
const WHATSAPP_API_URL_BASE = require("../config.js").WHATSAPP_API_URL_BASE;

const speechClient = new SpeechClient();

async function transcribeWhatsAppAudio(mediaId) {
    const mediaDetailsUrl = `${WHATSAPP_API_URL_BASE}${mediaId}`;

    const headers = {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
    };

    let responseAudio = await fetch(mediaDetailsUrl, {
        method: "GET",
        headers: headers,
    });

    if (!responseAudio.ok) {
        throw new Error("Error al obtener detalles del audio de Meta.");
    }
    const mediaDetails = await responseAudio.json();
    const audioUrl = mediaDetails.url;

    responseAudio = await fetch(audioUrl, {
        method: "GET",
        headers: headers,
    });

    if (!responseAudio.ok) {
        throw new Error("Error descargando el audio.");
    }

    const audioBuffer = Buffer.from(await responseAudio.arrayBuffer());

    const config = {
        encoding: "OGG_OPUS",
        sampleRateHertz: 24000,
        languageCode: "es-419",
        enableAutomaticPunctuation: true,
    };

    const audio = {
        content: audioBuffer.toString("base64"),
    };

    const request = {
        config: config,
        audio: audio,
    };

    const [response] = await speechClient.recognize(request);
    console.log("Respuesta de STT recibida:", response);
    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join("\n");

    console.log("Transcripción completada.", transcription);
    if (!transcription) {
        console.warn("STT no pudo transcribir el audio.");
        return "El usuario envió un audio que no pudo ser entendido.";
    }

    console.log(`Transcripción obtenida: "${transcription}"`);
    return transcription;
}

module.exports = {transcribeWhatsAppAudio};
