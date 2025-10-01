const WHATSAPP_API_URL_BASE = require("../config.js").WHATSAPP_API_URL_BASE;
const WHATSAPP_TOKEN = require("../config.js").WHATSAPP_TOKEN;

// eslint-disable-next-line require-jsdoc
async function sendWhatsAppMessage(to, message, businessPhoneId) {
  const url = `${WHATSAPP_API_URL_BASE}${businessPhoneId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: {
      body: message,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // eslint-disable-next-line max-len
      throw new Error(`WhatsApp API error: ${errorData.error?.message || response.statusText}`);
    }
  } catch (error) {
    console.error("Fallo al enviar mensaje a WhatsApp:", error);
  }
}

module.exports = {sendWhatsAppMessage};
