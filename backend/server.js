const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.BACKEND_PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 700);
const OPENAI_SYSTEM_PROMPT = process.env.OPENAI_SYSTEM_PROMPT || "";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";

if (typeof fetch !== "function") {
  console.error("Node 18+ is required because global fetch is missing.");
  process.exit(1);
}

function extractText(payload) {
  if (!payload || typeof payload !== "object") return "";

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload.output)) {
    const text = payload.output
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
      .filter(
        (part) =>
          part &&
          (part.type === "output_text" || part.type === "text") &&
          typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (text) return text;
  }

  if (Array.isArray(payload.choices)) {
    const content = payload.choices[0]?.message?.content;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
  }

  return "";
}

const app = express();

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  if (!OPENAI_API_KEY) {
    res.status(500).json({
      error: "Missing OPENAI_API_KEY in backend .env file."
    });
    return;
  }

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    res.status(400).json({ error: "Field 'prompt' is required." });
    return;
  }

  const openAiInput = [
    {
      role: "user",
      content: [{ type: "input_text", text: prompt }]
    }
  ];

  if (OPENAI_SYSTEM_PROMPT) {
    openAiInput.unshift({
      role: "system",
      content: [{ type: "input_text", text: OPENAI_SYSTEM_PROMPT }]
    });
  }

  const openAiBody = {
    model: OPENAI_MODEL,
    input: openAiInput,
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS
  };

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(openAiBody)
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const upstreamError = payload?.error?.message;

      res.status(response.status).json({
        error: upstreamError || `OpenAI API failed with status ${response.status}.`
      });
      return;
    }

    const text = extractText(payload);
    if (!text) {
      res.status(502).json({
        error: "OpenAI API returned an empty response."
      });
      return;
    }

    res.json({ text });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unexpected backend error.";
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[backend] Running on http://127.0.0.1:${PORT}`);
});
