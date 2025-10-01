/* eslint-disable max-len */
/* eslint-disable require-jsdoc */

const WHATSAPP_TOKEN = require("../config.js").WHATSAPP_TOKEN;
const WHATSAPP_API_URL_BASE = require("../config.js").WHATSAPP_API_URL_BASE;


async function downloadAndEncodeImage(mediaId) {
  const mediaDetailsUrl = `${WHATSAPP_API_URL_BASE}${mediaId}`;

  const headers = {
    "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
  };

  let response = await fetch(mediaDetailsUrl, {
    method: "GET",
    headers: headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error al obtener detalles del medio de WhatsApp: ${errorData.error?.message || response.statusText}`);
  }

  const mediaDetails = await response.json();
  const imageUrl = mediaDetails.url;
  const mimeType = mediaDetails.mime_type;

  response = await fetch(imageUrl, {
    method: "GET",
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(`Error descargando la imagen: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString("base64");

  return {
    base64Image,
    mimeType,
  };
}

module.exports = {downloadAndEncodeImage};
