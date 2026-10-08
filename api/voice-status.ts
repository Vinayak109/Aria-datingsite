export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-elevenlabs-api-key, xi-api-key");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const headerKey = req.headers?.["x-elevenlabs-api-key"] || req.headers?.["xi-api-key"];
  const apiKey =
    (typeof headerKey === "string" ? headerKey : "") ||
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_LABS_API_KEY ||
    process.env.XI_API_KEY ||
    process.env.VITE_ELEVENLABS_API_KEY ||
    process.env.VITE_ELEVEN_LABS_API_KEY ||
    process.env.VITE_XI_API_KEY ||
    "";

  const hasElevenLabs = Boolean(apiKey.trim());

  const configuredVoiceId = (
    process.env.ELEVENLABS_VOICE_ID ||
    process.env.ELEVEN_LABS_VOICE_ID ||
    process.env.VOICE_ID ||
    process.env.VITE_ELEVENLABS_VOICE_ID ||
    process.env.VITE_ELEVEN_LABS_VOICE_ID ||
    "7wlfJf72PCt9FjPj0Beg"
  ).trim();

  const availableVoices = [
    {
      id: "7wlfJf72PCt9FjPj0Beg",
      name: "Nishi (Hindi Storytelling & Warmth)",
      description: "24 y/o sweet Indian companion voice with expressive Hindi nuances",
      type: "custom",
    },
    {
      id: "pFZP5JQG7iQjIQuC4Bku",
      name: "Lily (Sweet, Soft Indian Rem)",
      description: "Gentle feminine voice speaking natural Hindi on Multilingual v2",
      type: "recommended",
    },
    {
      id: "cgSgspJ2msm6clMCkdW9",
      name: "Jessica (Playful & Caring)",
      description: "Warm, conversational voice with clear Hindi cadence",
      type: "alternative",
    },
    {
      id: "XrExE9yKIg1WjnnlVkGX",
      name: "Matilda (Calm & Empathetic)",
      description: "Soothing tone for late-night emotional chats",
      type: "alternative",
    },
  ];

  return res.status(200).json({
    hasElevenLabs,
    voiceId: configuredVoiceId,
    voiceName: hasElevenLabs
      ? "ElevenLabs Multilingual v2 (Aria • Indian Rem)"
      : "Native Indian Hindi (hi-IN Speech)",
    provider: hasElevenLabs ? "elevenlabs" : "browser",
    model: hasElevenLabs ? "eleven_multilingual_v2" : "hi-IN",
    availableVoices,
    description: "24-year-old soft, sweet Indian girl voice speaking natural pure Hindi",
  });
}
