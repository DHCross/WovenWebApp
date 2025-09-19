// netlify/functions/health.js
const { json, noContent } = require("./_shared.js");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return noContent();
  if (event.httpMethod !== "GET") return json(405, { success: false, error: "Method Not Allowed" });

  return json(200, { success: true, status: "ok", time: new Date().toISOString() });
};
