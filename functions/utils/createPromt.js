/** Crea el prompt completo combinando el historial (MCP) y el nuevo mensaje. */

// eslint-disable-next-line require-jsdoc
function createFullPrompt(history, newPrompt) {
  // eslint-disable-next-line max-len
  let context = "Eres Boby, un agente de IA experto en piezas de vehículos. Tu trabajo es identificar piezas, recomendar productos de mantenimiento y cotizar precios estimados. Siempre usa el historial para recordar el modelo del auto o cotizaciones previas.\n\n";

  history.forEach((item) => {
    context += `${item.role.toUpperCase()}: ${item.text}\n`;
  });

  context += `USER: ${newPrompt}\nBOBY (RESPUESTA):`;
  return context;
}

module.exports = {createFullPrompt};
