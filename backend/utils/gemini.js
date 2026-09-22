// Thin wrapper around Google Gemini's REST API.
// Uses Node's built-in fetch (Node 18+), so no extra npm package is needed.
//
// Get a free API key at: https://aistudio.google.com/apikey

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

/**
 * Send a prompt to Gemini and return the model's reply.
 * @param {string} prompt      The text prompt.
 * @param {object} options
 * @param {boolean} options.json  If true, ask Gemini for JSON and parse it.
 * @returns {Promise<string|object>}
 */
async function callGemini(prompt, { json = false } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const err = new Error(
      "AI is not configured. Add GEMINI_API_KEY to the server's .env file."
    );
    err.status = 503;
    throw err;
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${GEMINI_MODEL}:generateContent`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      // Ask the API to return valid JSON directly when we need structured data
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Newer Gemini API keys (prefixed "AQ.") are sent as a header,
        // not as a "?key=" query param.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    const err = new Error(
      "Could not reach the AI service. Check your internet connection."
    );
    err.status = 502;
    throw err;
  }

  if (!resp.ok) {
    const detail = await resp.text();
    const err = new Error(
      `AI request failed (${resp.status}). ${detail.slice(0, 200)}`
    );
    err.status = 502;
    throw err;
  }

  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!json) return text;

  // Parse JSON, tolerating code fences or stray text around it
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    const err = new Error("The AI returned an unexpected response.");
    err.status = 502;
    throw err;
  }
}

module.exports = { callGemini, GEMINI_MODEL };
