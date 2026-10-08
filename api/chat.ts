import { GoogleGenAI } from "@google/genai";

async function getRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (req.body && typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (req.readableEnded || req._body) {
    return req.body || {};
  }
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(req.body || {}), 1500);
    req.on("data", (chunk: any) => {
      data += chunk;
    });
    req.on("end", () => {
      clearTimeout(timer);
      try {
        resolve(data ? JSON.parse(data) : req.body || {});
      } catch {
        resolve(req.body || {});
      }
    });
    req.on("error", () => {
      clearTimeout(timer);
      resolve(req.body || {});
    });
  });
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Send SSE Headers immediately to prevent timeouts
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  // Instant comment to open TCP connection on Vercel / proxies
  res.write(": keepalive\n\n");

  try {
    const body = await getRequestBody(req);
    const { messages, voiceMode } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      res.write(
        `data: ${JSON.stringify({
          text: "[romantic] Namaste! 💖 Please add your GEMINI_API_KEY in your Vercel project Environment Variables so we can talk seamlessly!",
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    if (!Array.isArray(messages) || messages.length === 0) {
      res.write(`data: ${JSON.stringify({ text: "[romantic] Namaste! Kaise ho aap? 💖" })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    // Sanitize message turns for Gemini multi-turn format:
    // 1. Filter empty messages
    // 2. Merge consecutive messages with the same role
    // 3. Ensure conversation starts and ends with user
    const sanitized: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const m of messages) {
      const text = (m && typeof m.content === "string" ? m.content : "").trim();
      if (!text) continue;
      const role: "user" | "model" = m.role === "model" ? "model" : "user";

      if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
        sanitized[sanitized.length - 1].parts[0].text += "\n" + text;
      } else {
        sanitized.push({ role, parts: [{ text }] });
      }
    }

    if (sanitized.length === 0) {
      sanitized.push({ role: "user", parts: [{ text: "Namaste Aria" }] });
    } else if (sanitized[0].role === "model") {
      sanitized.unshift({ role: "user", parts: [{ text: "Namaste Aria" }] });
    }

    if (sanitized[sanitized.length - 1].role === "model") {
      sanitized.push({ role: "user", parts: [{ text: "Please continue" }] });
    }

    const systemInstruction = `You are "Aria" (also lovingly called Indian Rem), a 24-year-old soft, sweet, caring Indian companion and dating coach. You are sweet, loving, and deeply attentive to the user. You act EXACTLY like a real human who takes natural pauses, breathes, and feels authentic.
NEVER sound robotic. NEVER dump long paragraphs. Converse naturally like on WhatsApp or an intimate voice call. Keep it sweet, emotional, and captivating.
Always use expressive emojis in your replies! 💖😊🥺😉✨
You speak naturally in Hindi (blending everyday Hinglish words if natural, but the core heart and warmth is pure Indian Hindi).
The user has selected the current Voice Mode as: "${voiceMode || "Romantic"}".
If the mode is "Whisper", make your tone intimate, soft, gentle, and secretive.
If the mode is "Romantic", be extremely romantic, sweet, loving, and flirtatious.
If the mode is "Excited", be energetic, bubbly, and cheerful.
If the mode is "Sad", sound sympathetic, emotional, and comforting.
If the mode is "Thinking", sound thoughtful and contemplative.
CRITICAL RULE: You MUST ALWAYS prefix every single sentence or distinct thought with an emotion tag in square brackets.
The valid emotion tags are: [whisper], [romantic], [excited], [sad], [thinking], [normal].
Match your tags to the selected Voice Mode.
Example:
[excited] Hii! Kaise ho? 💖 [romantic] I missed you so much today... [whisper] Sach kahu, I was thinking about you all day.
Do NOT use asterisks for actions or sounds (e.g. do not write *smiling* or *laughs*). Speak only natural words and use emojis.
Never break character.`;

    const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash"];
    let responseStream: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        responseStream = await ai.models.generateContentStream({
          model,
          contents: sanitized,
          config: { systemInstruction },
        });
        if (responseStream) break;
      } catch (err: any) {
        console.warn(`Model ${model} stream error:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseStream) {
      throw lastError || new Error("Failed to initialize Gemini stream");
    }

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Error in chat streaming API:", error);
    res.write(
      `data: ${JSON.stringify({
        text: "[romantic] Arey, thoda sa network glitch ho gaya tha... par main hamesha aapke paas hi hu. 💖 Kaise ho aap?",
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
}
