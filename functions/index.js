/* eslint-disable require-jsdoc */
/* eslint-disable indent */
/* eslint-disable max-len */

const {onRequest} = require("firebase-functions/v2/https");
const {VERIFY_TOKEN} = require("./config.js");
const handleIncomingMessage = require("./utils/handleMessage.js").handleIncomingMessage;

exports.whatsappWebhook = onRequest(async (req, res) => {
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

    if (req.method === "POST") {
      res.status(200).send("EVENT_RECEIVED");
      const data = req.body;
      if (data.object === "whatsapp_business_account") {
        try {
          for (const entry of data.entry) {
            for (const change of entry.changes) {
              for (const message of change.value.messages || []) {
                const senderId = message.from;
                const businessPhoneId = change.value.metadata.phone_number_id;
                handleIncomingMessage(senderId, message, businessPhoneId)
                  .catch((error) => {
                    console.error(`Error procesando mensaje de ${senderId}:`, error);
                  });
              }
            }
          }
        } catch (error) {
          console.error("Error al iterar sobre el cuerpo del webhook:", error);
        }
        return;
      }
    }

    res.status(405).send("Method Not Allowed");
  });

