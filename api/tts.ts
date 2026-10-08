interface CachedTTSResult {
  audio: string;
  voiceId: string;
  voiceName: string;
  requestedVoiceId: string;
  switchedFromRequested: boolean;
  notice?: string;
}

// Simple in-memory cache for ultra-fast audio playback
const ttsCache = new Map<string, CachedTTSResult>();

function resolveApiKey(req: any, body: any): string {
  const headerKey = req.headers?.["x-elevenlabs-api-key"] || req.headers?.["xi-api-key"];
  const bodyKey = body?.clientApiKey || body?.apiKey;
  return (
    (typeof headerKey === "string" ? headerKey : "") ||
    (typeof bodyKey === "string" ? bodyKey : "") ||
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_LABS_API_KEY ||
    process.env.XI_API_KEY ||
    process.env.VITE_ELEVENLABS_API_KEY ||
    process.env.VITE_ELEVEN_LABS_API_KEY ||
    process.env.VITE_XI_API_KEY ||
    ""
  ).trim();
}

function resolveConfiguredVoiceId(body: any): string {
  const bodyVoiceId = body?.voiceId;
  return (
    (typeof bodyVoiceId === "string" ? bodyVoiceId : "") ||
    process.env.ELEVENLABS_VOICE_ID ||
    process.env.ELEVEN_LABS_VOICE_ID ||
    process.env.VOICE_ID ||
    process.env.VITE_ELEVENLABS_VOICE_ID ||
    process.env.VITE_ELEVEN_LABS_VOICE_ID ||
    "7wlfJf72PCt9FjPj0Beg" // Nishi (Hindi Storyteller)
  ).trim();
}

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
  // Safe stream reader with timeout for Vercel serverless
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-elevenlabs-api-key, xi-api-key");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const body = await getRequestBody(req);
    const { text, emotion, voiceMode } = body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanText = text.trim();
    const apiKey = resolveApiKey(req, body);
    const requestedVoiceId = resolveConfiguredVoiceId(body);

    const cacheKey = `${requestedVoiceId}_${emotion || "default"}_${cleanText}`;

    // Return cached audio if present
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      return res.status(200).json({
        audio: cached.audio,
        format: "mp3",
        provider: "elevenlabs",
        cached: true,
        voiceId: cached.voiceId,
        voiceName: cached.voiceName,
        requestedVoiceId: cached.requestedVoiceId,
        switchedFromRequested: cached.switchedFromRequested,
        notice: cached.notice,
      });
    }

    if (apiKey) {
      try {
        // Voice candidate priority:
        // 1. Requested Voice ID (e.g. 7wlfJf72PCt9FjPj0Beg Nishi Hindi, or custom user clone)
        // 2. Lily (pFZP5JQG7iQjIQuC4Bku) - Sweet, warm young feminine Hindi voice on Multilingual v2
        // 3. Jessica (cgSgspJ2msm6clMCkdW9) - Playful, natural Hindi voice
        // 4. Matilda (XrExE9yKIg1WjnnlVkGX) - Gentle Hindi voice
        // 5. Bella (EXAVITQu4vr4xnSDxMaL) - Soft voice
        const candidateVoiceIds = [
          requestedVoiceId,
          "pFZP5JQG7iQjIQuC4Bku", // Lily (Multilingual v2 Hindi compatible)
          "cgSgspJ2msm6clMCkdW9", // Jessica
          "XrExE9yKIg1WjnnlVkGX", // Matilda
          "EXAVITQu4vr4xnSDxMaL", // Bella
        ].filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i);

        const stability = emotion === "excited" ? 0.38 : emotion === "whisper" ? 0.65 : 0.48;
        const style = emotion === "romantic" ? 0.35 : emotion === "excited" ? 0.3 : 0.2;

        let audioBase64: string | null = null;
        let usedVoiceId: string | null = null;
        let lastErrorDetail: string | null = null;
        let usedVoiceName = "Aria Indian Rem";

        for (const voiceId of candidateVoiceIds) {
          try {
            const elevenResponse = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
              {
                method: "POST",
                headers: {
                  "xi-api-key": apiKey,
                  "Content-Type": "application/json",
                  Accept: "audio/mpeg",
                },
                body: JSON.stringify({
                  text: cleanText,
                  model_id: "eleven_multilingual_v2",
                  voice_settings: {
                    stability,
                    similarity_boost: 0.85,
                    style,
                    use_speaker_boost: true,
                  },
                }),
              }
            );

            if (elevenResponse.ok) {
              const arrayBuffer = await elevenResponse.arrayBuffer();
              audioBase64 = Buffer.from(arrayBuffer).toString("base64");
              usedVoiceId = voiceId;

              if (voiceId === "7wlfJf72PCt9FjPj0Beg") {
                usedVoiceName = "Nishi (Hindi Storyteller - ElevenLabs)";
              } else if (voiceId === "pFZP5JQG7iQjIQuC4Bku") {
                usedVoiceName = "Lily (Sweet Indian Rem - ElevenLabs Multilingual v2)";
              } else if (voiceId === "cgSgspJ2msm6clMCkdW9") {
                usedVoiceName = "Jessica (Playful Companion - ElevenLabs)";
              } else if (voiceId === "XrExE9yKIg1WjnnlVkGX") {
                usedVoiceName = "Matilda (Warm Hindi - ElevenLabs)";
              } else {
                usedVoiceName = `ElevenLabs Voice (${voiceId})`;
              }
              break;
            } else {
              const errBody = await elevenResponse.text();
              lastErrorDetail = `Voice ${voiceId} returned ${elevenResponse.status}: ${errBody.slice(0, 140)}`;
              console.warn(lastErrorDetail);
            }
          } catch (err: any) {
            console.warn(`Fetch error for voiceId ${voiceId}:`, err?.message || err);
          }
        }

        if (audioBase64) {
          if (ttsCache.size > 200) {
            const firstKey = ttsCache.keys().next().value;
            if (firstKey) ttsCache.delete(firstKey);
          }
          const notice =
            usedVoiceId !== requestedVoiceId
              ? `Note: Requested voice (${requestedVoiceId}) required upgraded plan for API library access. Seamlessly used ${usedVoiceName} so natural Indian voice plays!`
              : undefined;

          ttsCache.set(cacheKey, {
            audio: audioBase64,
            voiceId: usedVoiceId || requestedVoiceId,
            voiceName: usedVoiceName,
            requestedVoiceId,
            switchedFromRequested: usedVoiceId !== requestedVoiceId,
            notice,
          });

          return res.status(200).json({
            audio: audioBase64,
            format: "mp3",
            provider: "elevenlabs",
            voiceId: usedVoiceId,
            voiceName: usedVoiceName,
            requestedVoiceId,
            switchedFromRequested: usedVoiceId !== requestedVoiceId,
            notice,
          });
        }
      } catch (elevenErr) {
        console.error("ElevenLabs request error:", elevenErr);
      }
    }

    // Fallback signal for browser native Indian Hindi speech synthesis
    return res.status(200).json({
      fallback: true,
      provider: "browser",
      message: "Using native Indian Hindi speech synthesis",
      hasApiKey: Boolean(apiKey),
    });
  } catch (error: any) {
    console.error("Error in TTS API:", error);
    return res.status(200).json({ fallback: true, provider: "browser" });
  }
}
