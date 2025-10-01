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

    let response = await fetch(mediaDetailsUrl, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        throw new Error("Error al obtener detalles del audio de Meta.");
    }
    const mediaDetails = await response.json();
    const audioUrl = mediaDetails.url;

    // Paso 2: Descargar el archivo de audio
    response = await fetch(audioUrl, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        throw new Error("Error descargando el audio.");
    }

    // Obtenemos los datos binarios del audio
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Paso 3: Enviar el audio a Google Cloud Speech-to-Text
    const config = {
        // WhatsApp/Meta usa OPUS, que se codifica en OGG (audio/ogg)
        encoding: "OGG_OPUS",
        sampleRateHertz: 16000, // Ajusta si sabes la frecuencia de muestreo, 16000 es común.
        languageCode: "es-419", // Ejemplo: Español de Latinoamérica
    };

    const audio = {
        content: audioBuffer.toString("base64"),
    };

    const request = {
        config: config,
        audio: audio,
    };

    console.log("Transcribiendo audio...");
    const [sttResponse] = await speechClient.recognize(request);
    const transcription = sttResponse.results
        .map(result => result.alternatives[0].transcript)
        .join("\n");

    if (!transcription) {
        console.warn("STT no pudo transcribir el audio.");
        return "El usuario envió un audio que no pudo ser entendido.";
    }

    console.log(`Transcripción obtenida: "${transcription}"`);
    return transcription;
}

module.exports = {transcribeWhatsAppAudio};
