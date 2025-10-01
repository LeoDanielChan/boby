/* eslint-disable require-jsdoc */
/* eslint-disable indent */
/* eslint-disable max-len */
// functions/index.js

// const functions = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {VERIFY_TOKEN} = require("./config.js");
const handleIncomingMessage = require("./utils/handleMessage.js").handleIncomingMessage;
// const {initializeApp} = require("firebase-admin/app");
// const {getFirestore} = require("firebase-admin/firestore");
//
// initializeApp();
// const db = getFirestore(undefined, "boby-store");

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

