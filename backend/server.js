const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.BACKEND_PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 1400);
const OPENAI_SYSTEM_PROMPT = process.env.OPENAI_SYSTEM_PROMPT || "";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const CONTEXT_URL_MAX_CHARS = 500;
const CONTEXT_TITLE_MAX_CHARS = 500;
const CONTEXT_SELECTION_MAX_CHARS = 2000;
const CONTEXT_ACTIVE_ELEMENT_MAX_CHARS = 2000;
const CONTEXT_VISIBLE_TEXT_MAX_CHARS = 12000;
const ATTACHMENT_MAX_COUNT = 2;
const ATTACHMENT_MAX_DATA_URL_CHARS = 8_000_000;
const ATTACHMENT_LABEL_MAX_CHARS = 140;
const CHAIN_MAX_STEPS = 5;
const CHAIN_MAX_ITEMS = 4;
const CHAIN_TITLE_MAX_CHARS = 140;
const CHAIN_ITEM_MAX_CHARS = 280;
const ANSWER_MAX_CHARS = 30000;

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

function toTrimmedString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function truncateText(value, maxChars) {
  const text = toTrimmedString(value);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function buildPageContextText(pageContext) {
  if (!pageContext || typeof pageContext !== "object") return "";

  const url = truncateText(pageContext.url, CONTEXT_URL_MAX_CHARS);
  const title = truncateText(pageContext.title, CONTEXT_TITLE_MAX_CHARS);
  const language = truncateText(pageContext.language, 30);
  const selectionText = truncateText(pageContext.selectionText, CONTEXT_SELECTION_MAX_CHARS);
  const activeElementText = truncateText(
    pageContext.activeElementText,
    CONTEXT_ACTIVE_ELEMENT_MAX_CHARS
  );
  const visibleText = truncateText(pageContext.visibleText, CONTEXT_VISIBLE_TEXT_MAX_CHARS);
  const viewport =
    pageContext.viewport &&
    Number.isFinite(pageContext.viewport.width) &&
    Number.isFinite(pageContext.viewport.height)
      ? `${Math.max(0, Math.floor(pageContext.viewport.width))}x${Math.max(
          0,
          Math.floor(pageContext.viewport.height)
        )}`
      : "";

  const sections = [];

  if (url) sections.push(`URL: ${url}`);
  if (title) sections.push(`Title: ${title}`);
  if (language) sections.push(`Language: ${language}`);
  if (viewport) sections.push(`Viewport: ${viewport}`);
  if (selectionText) sections.push(`Selected text:\n${selectionText}`);
  if (activeElementText) sections.push(`Focused field text:\n${activeElementText}`);
  if (visibleText) sections.push(`Visible page text:\n${visibleText}`);

  return sections.join("\n\n");
}

function normalizeImageAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) return [];

  return rawAttachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") return null;

      const type = toTrimmedString(attachment.type).toLowerCase();
      if (type && type !== "image") return null;

      const dataUrl = typeof attachment.dataUrl === "string" ? attachment.dataUrl.trim() : "";
      if (!dataUrl || dataUrl.length > ATTACHMENT_MAX_DATA_URL_CHARS) return null;

      const mimeMatch = /^data:(image\/(?:png|jpeg|jpg|webp));base64,/i.exec(dataUrl);
      if (!mimeMatch) return null;

      const mimeType = mimeMatch[1].toLowerCase();
      const width = Number.isFinite(attachment.width) ? Math.max(1, Math.floor(attachment.width)) : null;
      const height = Number.isFinite(attachment.height)
        ? Math.max(1, Math.floor(attachment.height))
        : null;
      const label = truncateText(attachment.label, ATTACHMENT_LABEL_MAX_CHARS);

      return {
        mimeType,
        dataUrl,
        width,
        height,
        label
      };
    })
    .filter(Boolean)
    .slice(0, ATTACHMENT_MAX_COUNT);
}

function buildAttachmentContextText(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return "";

  return attachments
    .map((attachment, index) => {
      const parts = [`Attachment ${index + 1}: ${attachment.mimeType}`];
      if (attachment.width && attachment.height) {
        parts.push(`${attachment.width}x${attachment.height}`);
      }
      if (attachment.label) {
        parts.push(`label="${attachment.label}"`);
      }
      return parts.join(" | ");
    })
    .join("\n");
}

function buildPromptWithContext(prompt, pageContext, attachments) {
  const pageContextText = buildPageContextText(pageContext);
  const attachmentContextText = buildAttachmentContextText(attachments);
  if (!pageContextText && !attachmentContextText) return prompt;

  const parts = [
    "The user is asking from a webpage.",
    "Use the page context and attached screenshots when relevant.",
    "If context is missing, clearly state what is not available.",
    ""
  ];

  if (pageContextText) {
    parts.push("[Page context]");
    parts.push(pageContextText);
    parts.push("");
  }

  if (attachmentContextText) {
    parts.push("[Attached screenshots]");
    parts.push(attachmentContextText);
    parts.push("");
  }

  parts.push("[User question]");
  parts.push(prompt);

  return parts.join("\n");
}

function buildModelInput(promptWithContext) {
  return [
    "Return ONLY valid JSON with this shape:",
    '{ "answer": "string", "chain_of_thought": [{ "title": "string", "items": ["string"] }] }',
    "",
    "Rules:",
    "- answer: detailed and practical by default; use multiple paragraphs unless the user asks for short output.",
    "- chain_of_thought: a high-level reasoning summary, 2-4 steps, with short bullet items.",
    "- Do not include markdown fences.",
    "- Do not add extra keys.",
    "",
    promptWithContext
  ].join("\n");
}

function stripCodeFences(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

function toSafeAnswerText(value) {
  const text = toTrimmedString(value);
  if (!text) return "";
  return text.slice(0, ANSWER_MAX_CHARS);
}

function normalizeChainOfThought(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((step) => {
      const title = truncateText(step?.title, CHAIN_TITLE_MAX_CHARS);
      const items = Array.isArray(step?.items)
        ? step.items
            .map((item) => truncateText(item, CHAIN_ITEM_MAX_CHARS))
            .filter(Boolean)
            .slice(0, CHAIN_MAX_ITEMS)
        : [];
      return { title, items };
    })
    .filter((step) => step.title && step.items.length > 0)
    .slice(0, CHAIN_MAX_STEPS);
}

function buildFallbackChainOfThought(pageContext, attachments = []) {
  const contextItems = [];
  if (toTrimmedString(pageContext?.title)) {
    contextItems.push(`Page title used: ${truncateText(pageContext.title, 110)}`);
  }
  if (toTrimmedString(pageContext?.selectionText)) {
    contextItems.push("Selected text was prioritized.");
  }
  if (toTrimmedString(pageContext?.activeElementText)) {
    contextItems.push("Text in the focused editor/input was included.");
  }
  if (toTrimmedString(pageContext?.visibleText)) {
    contextItems.push("Visible page content was included.");
  }
  if (Array.isArray(attachments) && attachments.length > 0) {
    contextItems.push(
      `${attachments.length} screenshot attachment${attachments.length > 1 ? "s were" : " was"} included.`
    );
  }
  if (contextItems.length === 0) {
    contextItems.push("No rich page context was detected; answer based on the user prompt.");
  }

  return [
    {
      title: "Context collection",
      items: contextItems
    },
    {
      title: "Answer drafting",
      items: ["Built a direct response that prioritizes the page context and the user goal."]
    }
  ];
}

function extractJsonObject(rawText) {
  const plain = stripCodeFences(rawText);
  if (!plain) return null;

  const direct = (() => {
    try {
      return JSON.parse(plain);
    } catch (error) {
      return null;
    }
  })();
  if (direct) return direct;

  const firstBrace = plain.indexOf("{");
  const lastBrace = plain.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  try {
    return JSON.parse(plain.slice(firstBrace, lastBrace + 1));
  } catch (error) {
    return null;
  }
}

function parseStructuredResponse(rawText, pageContext, attachments = []) {
  const parsed = extractJsonObject(rawText);
  if (parsed && typeof parsed === "object") {
    const answer = toSafeAnswerText(parsed.answer);
    const chainOfThought = normalizeChainOfThought(
      parsed.chain_of_thought || parsed.chainOfThought || parsed.reasoning_steps
    );
    if (answer) {
      return {
        answer,
        chainOfThought: chainOfThought.length
          ? chainOfThought
          : buildFallbackChainOfThought(pageContext, attachments)
      };
    }
  }

  const answer = toSafeAnswerText(rawText);
  if (!answer) return null;

  return {
    answer,
    chainOfThought: buildFallbackChainOfThought(pageContext, attachments)
  };
}

const app = express();

app.use(express.json({ limit: "12mb" }));

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
  const pageContext =
    req.body?.pageContext && typeof req.body.pageContext === "object"
      ? req.body.pageContext
      : null;
  const imageAttachments = normalizeImageAttachments(req.body?.attachments);
  const promptWithContext = buildPromptWithContext(prompt, pageContext, imageAttachments);
  const modelInput = buildModelInput(promptWithContext);
  const baseSystemPrompt =
    "You are a precise assistant integrated into a browser extension. Use the provided page context and screenshots when relevant, and avoid inventing details.";
  const fullSystemPrompt = OPENAI_SYSTEM_PROMPT
    ? `${baseSystemPrompt}\n\n${OPENAI_SYSTEM_PROMPT}`
    : baseSystemPrompt;

  const userContent = [{ type: "input_text", text: modelInput }];
  imageAttachments.forEach((attachment, index) => {
    userContent.push({
      type: "input_text",
      text: attachment.label
        ? `Attached screenshot ${index + 1}: ${attachment.label}`
        : `Attached screenshot ${index + 1}`
    });
    userContent.push({
      type: "input_image",
      image_url: attachment.dataUrl
    });
  });

  const openAiInput = [
    {
      role: "system",
      content: [{ type: "input_text", text: fullSystemPrompt }]
    },
    {
      role: "user",
      content: userContent
    }
  ];

  const openAiBody = {
    model: OPENAI_MODEL,
    input: openAiInput,
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
    temperature: 0.4
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

    const rawText = extractText(payload);
    if (!rawText) {
      res.status(502).json({
        error: "OpenAI API returned an empty response."
      });
      return;
    }

    const structured = parseStructuredResponse(rawText, pageContext, imageAttachments);
    if (!structured) {
      res.status(502).json({
        error: "OpenAI API returned an invalid structured response."
      });
      return;
    }

    res.json({
      text: structured.answer,
      chainOfThought: structured.chainOfThought
    });
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
