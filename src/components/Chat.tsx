import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Send,
  Volume2,
  VolumeX,
  Mic,
  CheckCheck,
  Radio,
  Sparkles,
  Zap,
  SlidersHorizontal,
  Settings,
  X,
  Check,
  Play,
  Info,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WaveformVisualizer } from "./WaveformVisualizer";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatProps {
  onBack: () => void;
}

export function Chat({ onBack }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      content:
        "Namaste! Main Aria hu (Rem) 💖 Main pure Hindi me aapse baat karti hu and I love chatting with you. How are you feeling today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState("Romantic");
  const [isListening, setIsListening] = useState(false);
  const [interimResult, setInterimResult] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotionState, setCurrentEmotionState] = useState("romantic");

  const [voiceEngineInfo, setVoiceEngineInfo] = useState<{
    hasElevenLabs: boolean;
    provider: string;
    voiceName: string;
    model: string;
  }>({
    hasElevenLabs: false,
    provider: "browser",
    voiceName: "Native Indian Hindi Voice (hi-IN)",
    model: "hi-IN",
  });

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Web Audio Context & Analyser for real-time waveform visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // TTS State
  const speechQueue = useRef<{ text: string; emotion: string }[]>([]);
  const isFetchingTTS = useRef(false);
  const accumulatedText = useRef("");

  const rawModelText = useRef("");
  const cleanModelText = useRef("");
  const currentEmotion = useRef("romantic");

  // User Voice Configuration & Settings
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    return localStorage.getItem("aria_selected_voice_id") || "7wlfJf72PCt9FjPj0Beg";
  });
  const [clientApiKey, setClientApiKey] = useState<string>(() => {
    return localStorage.getItem("aria_elevenlabs_api_key") || "";
  });
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [customVoiceInput, setCustomVoiceInput] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<
    { id: string; name: string; description: string; type: string }[]
  >([
    {
      id: "7wlfJf72PCt9FjPj0Beg",
      name: "Nishi (Hindi Storyteller - ElevenLabs)",
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
      description: "Warm conversational voice with clear Hindi cadence",
      type: "alternative",
    },
    {
      id: "XrExE9yKIg1WjnnlVkGX",
      name: "Matilda (Calm & Empathetic)",
      description: "Soothing tone for late-night emotional chats",
      type: "alternative",
    },
  ]);

  // Fetch voice engine availability on mount
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (clientApiKey) {
      headers["x-elevenlabs-api-key"] = clientApiKey;
    }

    fetch("/api/voice-status", { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          if (data.voiceName) {
            setVoiceEngineInfo({
              hasElevenLabs: Boolean(data.hasElevenLabs),
              provider: data.provider || "browser",
              voiceName: data.voiceName,
              model: data.model || "hi-IN",
            });
          }
          if (data.availableVoices && Array.isArray(data.availableVoices)) {
            setAvailableVoices(data.availableVoices);
          }
          if (data.voiceId && !localStorage.getItem("aria_selected_voice_id")) {
            setSelectedVoiceId(data.voiceId);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not check voice status:", err);
      });
  }, [clientApiKey]);

  // Initialize Audio Context on demand
  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        setAnalyserNode(analyser);
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "hi-IN";

      recognitionRef.current.onresult = (event: any) => {
        stopSpeaking(); // Instantly stop Rem speaking when user talks

        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setInput((prev) => (prev + " " + final).trim());
          setInterimResult("");
        }
        if (interim) {
          setInterimResult(interim);
        } else {
          setInterimResult("");
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        stopMicStream();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        stopMicStream();
      };
    }

    // Preload available voices
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // Cleanup TTS and Recognition on unmount
    return () => {
      stopSpeaking();
      stopMicStream();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startMicStream = async () => {
    try {
      initAudio();
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        if (audioContextRef.current && analyserRef.current) {
          const micSource = audioContextRef.current.createMediaStreamSource(stream);
          micSource.connect(analyserRef.current);
          micSourceRef.current = micSource;
        }
      }
    } catch (e) {
      console.warn("Microphone visualizer hook notice:", e);
    }
  };

  const stopMicStream = () => {
    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch (e) {}
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  };

  // Play ElevenLabs audio via Web Audio BufferSource directly to AnalyserNode
  const playElevenLabsAudio = async (base64Audio: string): Promise<boolean> => {
    try {
      initAudio();
      const ctx = audioContextRef.current;
      const analyser = analyserRef.current;
      if (!ctx || !analyser) return false;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Convert base64 mp3 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {}
        currentSourceRef.current = null;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      currentSourceRef.current = source;
      setIsSpeaking(true);

      source.onended = () => {
        setIsSpeaking(false);
        currentSourceRef.current = null;
        isFetchingTTS.current = false;
        if (voiceEnabled && !isListening) {
          fetchNextTTS();
        }
      };

      source.start(0);
      return true;
    } catch (err) {
      console.warn("ElevenLabs buffer decode warning, falling back to HTML5 audio:", err);
      try {
        const audio = new Audio("data:audio/mp3;base64," + base64Audio);
        setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          isFetchingTTS.current = false;
          if (voiceEnabled && !isListening) {
            fetchNextTTS();
          }
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          isFetchingTTS.current = false;
        };
        await audio.play();
        return true;
      } catch (audioErr) {
        console.warn("HTML5 audio playback failed:", audioErr);
        return false;
      }
    }
  };

  // Play Browser Native Indian Hindi voice
  const playBrowserTTS = (text: string, emotion: string) => {
    initAudio();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      // Prioritize genuine native Indian Hindi female voices
      const selectedVoice =
        voices.find(
          (v) =>
            (v.lang === "hi-IN" || v.lang.startsWith("hi_") || v.lang === "hi") &&
            (v.name.includes("Swara") ||
              v.name.includes("Lekha") ||
              v.name.includes("हिन्दी") ||
              v.name.includes("Google") ||
              v.name.includes("Female") ||
              v.name.includes("Neerja") ||
              v.name.includes("Kavya")),
        ) ||
        voices.find((v) => v.lang.includes("hi")) ||
        voices.find(
          (v) =>
            (v.lang === "en-IN" || v.lang.includes("IN")) &&
            (v.name.includes("Female") || v.name.includes("Swara")),
        );

      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = "hi-IN";

      let rate = 1.0;
      let pitch = 1.1;

      if (voiceMode === "Whisper" || emotion === "whisper") {
        pitch = 0.85;
        rate = 0.9;
      } else if (voiceMode === "Romantic" || emotion === "romantic") {
        pitch = 1.15;
        rate = 0.95;
      } else if (voiceMode === "Excited" || emotion === "excited") {
        pitch = 1.25;
        rate = 1.1;
      }

      utterance.rate = rate;
      utterance.pitch = pitch;

      setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        isFetchingTTS.current = false;
        if (voiceEnabled && !isListening) fetchNextTTS();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isFetchingTTS.current = false;
        if (voiceEnabled && !isListening) fetchNextTTS();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Browser speech synthesis error:", e);
      setIsSpeaking(false);
      isFetchingTTS.current = false;
      if (voiceEnabled && !isListening) fetchNextTTS();
    }
  };

  const testVoiceAudio = async (voiceIdToTest?: string) => {
    initAudio();
    stopSpeaking();
    setIsTestingVoice(true);
    const targetVoiceId = voiceIdToTest || selectedVoiceId;
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clientApiKey ? { "x-elevenlabs-api-key": clientApiKey } : {}),
        },
        body: JSON.stringify({
          text: "नमस्ते! मैं रिया हूँ। आपकी अपनी 24 साल की भारतीय साथी। आज हम किस बारे में बात करें?",
          emotion: "romantic",
          voiceMode: "Romantic",
          voiceId: targetVoiceId,
          clientApiKey,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.notice) {
          setVoiceNotice(data.notice);
        }
        if (data.audio && data.provider === "elevenlabs") {
          await playElevenLabsAudio(data.audio);
          setIsTestingVoice(false);
          return;
        }
      }
      playBrowserTTS(
        "नमस्ते! मैं रिया हूँ। आपकी अपनी प्यारी भारतीय साथी।",
        "romantic",
      );
    } catch (err) {
      console.warn("Test voice error:", err);
      playBrowserTTS(
        "नमस्ते! मैं रिया हूँ। आपकी अपनी प्यारी भारतीय साथी।",
        "romantic",
      );
    } finally {
      setIsTestingVoice(false);
    }
  };

  const fetchNextTTS = async () => {
    if (
      !voiceEnabled ||
      isFetchingTTS.current ||
      speechQueue.current.length === 0 ||
      isListening
    )
      return;

    isFetchingTTS.current = true;
    const item = speechQueue.current.shift()!;
    const { text, emotion } = item;
    setCurrentEmotionState(emotion || "romantic");

    try {
      // 1. Attempt ElevenLabs endpoint from backend with user voice selection
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clientApiKey ? { "x-elevenlabs-api-key": clientApiKey } : {}),
        },
        body: JSON.stringify({
          text,
          emotion,
          voiceMode,
          voiceId: selectedVoiceId,
          clientApiKey,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.notice) {
          setVoiceNotice(data.notice);
        }
        if (data.audio && data.provider === "elevenlabs") {
          const played = await playElevenLabsAudio(data.audio);
          if (played) return; // Audio playback started via Web Audio
        }
      }

      // 2. Graceful fallback to authentic native Indian Hindi voice
      playBrowserTTS(text, emotion);
    } catch (error) {
      console.warn("TTS API fallback to native Indian Hindi:", error);
      playBrowserTTS(text, emotion);
    }
  };

  const stopSpeaking = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechQueue.current = [];
    isFetchingTTS.current = false;
    accumulatedText.current = "";
    setIsSpeaking(false);
  };

  const processTTSChunk = (
    chunk: string,
    emotion: string,
    isLast: boolean = false,
  ) => {
    if (!voiceEnabled) return;
    accumulatedText.current += chunk;

    // Split by sentence boundaries
    const sentenceRegex = /([^.!?।\n]+[.!?।\n]+)/g;
    let match;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(accumulatedText.current)) !== null) {
      let sentence = match[0].trim();
      // Remove emojis, markdown, and asterisks
      sentence = sentence.replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/gu,
        "",
      );
      sentence = sentence.replace(/\*.*?\*/g, "");
      sentence = sentence.replace(/[\*\_~`]/g, "");
      sentence = sentence.trim();

      if (sentence) {
        speechQueue.current.push({ text: sentence, emotion });
      }
      lastIndex = match.index + match[0].length;
    }

    accumulatedText.current = accumulatedText.current.substring(lastIndex);

    if (isLast && accumulatedText.current.trim().length > 0) {
      let sentence = accumulatedText.current.trim();
      sentence = sentence.replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/gu,
        "",
      );
      sentence = sentence.replace(/\*.*?\*/g, "");
      sentence = sentence.replace(/[\*\_~`]/g, "");
      sentence = sentence.trim();

      if (sentence) {
        speechQueue.current.push({ text: sentence, emotion });
      }
      accumulatedText.current = "";
    }

    fetchNextTTS();
  };

  const playSingleMessage = async (text: string) => {
    initAudio();
    stopSpeaking();
    let clean = text.replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/gu,
      "",
    );
    clean = clean.replace(/\[([a-zA-Z]*)\]?/g, "");
    clean = clean.replace(/\*.*?\*/g, "").replace(/[\*\_~`]/g, "").trim();
    if (!clean) return;

    speechQueue.current = [{ text: clean, emotion: voiceMode.toLowerCase() }];
    fetchNextTTS();
  };

  const handleSend = async () => {
    const finalInput = (input + " " + interimResult).trim();
    if (!finalInput) return;

    initAudio();
    stopSpeaking();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      stopMicStream();
      setInterimResult("");
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: finalInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    rawModelText.current = "";
    cleanModelText.current = "";
    currentEmotion.current = "romantic";

    const modelMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: modelMessageId,
        role: "model",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    const payloadMessages = messages
      .concat(userMessage)
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

    const sendRequest = async (retriesLeft = 1): Promise<Response> => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            voiceMode,
          }),
        });
        if (!res.ok && retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return sendRequest(retriesLeft - 1);
        }
        return res;
      } catch (networkErr) {
        if (retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return sendRequest(retriesLeft - 1);
        }
        throw networkErr;
      }
    };

    try {
      const response = await sendRequest();

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setIsTyping(false);

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          processTTSChunk("", currentEmotion.current, true);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMessageId ? { ...m, isStreaming: false } : m,
            ),
          );
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let nextNewline = buffer.indexOf("\n\n");

        while (nextNewline !== -1) {
          const chunk = buffer.slice(0, nextNewline);
          buffer = buffer.slice(nextNewline + 2);

          for (let line of chunk.split("\n")) {
            line = line.trim();
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.text) {
                  rawModelText.current += data.text;

                  // Extract latest emotion tag for TTS
                  const tags = [
                    ...rawModelText.current.matchAll(/\[([a-zA-Z]+)\]/g),
                  ];
                  if (tags.length > 0) {
                    currentEmotion.current = tags[tags.length - 1][1];
                    setCurrentEmotionState(currentEmotion.current);
                  }

                  const prevCleanLength = cleanModelText.current.length;
                  cleanModelText.current = rawModelText.current.replace(
                    /\[([a-zA-Z]*)\]?/g,
                    "",
                  );

                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id === modelMessageId) {
                        return { ...m, content: cleanModelText.current };
                      }
                      return m;
                    }),
                  );

                  const newCleanText =
                    cleanModelText.current.substring(prevCleanLength);
                  if (newCleanText) {
                    processTTSChunk(newCleanText, currentEmotion.current);
                  }
                }
              } catch (e) {
                console.error("Error parsing SSE:", e, line);
              }
            }
          }

          nextNewline = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsTyping(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMessageId
            ? {
                ...m,
                content:
                  "Arey, network me thodi problem aa gayi shayad... Ek baar phir se bolo na? 🥺💖",
                isStreaming: false,
              }
            : m,
        ),
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const toggleListening = () => {
    initAudio();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      stopMicStream();
      setInterimResult("");
    } else {
      stopSpeaking();
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        startMicStream();
      } catch (err) {
        console.error("Could not start speech recognition:", err);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0A0A0A] text-[#F5F5F5] font-sans overflow-hidden">
      {/* Left Panel - Image & Dedicated Real-Time Waveform Presence (Desktop) */}
      <div className="hidden lg:flex flex-col w-[380px] xl:w-[440px] h-full relative border-r border-white/5 shrink-0 bg-[#121212] overflow-hidden">
        {/* Background Photo with Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="w-full h-full bg-cover bg-center opacity-40 transition-transform duration-1000 scale-105"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800')",
              filter: "contrast(115%) brightness(85%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-[#0A0A0A]/40" />
        </div>

        {/* Back Button */}
        <div className="relative z-20 p-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
            <Radio
              className={`w-3.5 h-3.5 ${
                isSpeaking
                  ? "text-rose-400 animate-pulse"
                  : isListening
                  ? "text-cyan-400 animate-pulse"
                  : "text-emerald-400"
              }`}
            />
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">
              {isSpeaking
                ? "Aria Live"
                : isListening
                ? "Listening"
                : "Online"}
            </span>
          </div>
        </div>

        {/* Center / Bottom Info & Real-Time Waveform Visualizer */}
        <div className="relative z-20 mt-auto p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <img src="/logo.svg" alt="Aria Logo" className="w-6 h-6 rounded-md shadow-sm" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-rose-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 24 y/o Indian Companion
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white">
              Aria • Rem
            </h1>
            <p className="text-rose-200/70 text-xs mt-1.5 font-medium leading-relaxed">
              Sweet, soft, intimate voice companion speaking pure Indian Hindi with natural pauses.
            </p>
          </div>

          {/* Real-Time Waveform Visualizer Card */}
          <div className="pt-2">
            <WaveformVisualizer
              analyser={analyserNode}
              isSpeaking={isSpeaking}
              isListening={isListening}
              emotion={currentEmotionState || voiceMode.toLowerCase()}
              variant="hero"
              label={
                isSpeaking
                  ? "Aria Speaking (Hindi Rem)"
                  : isListening
                  ? "Listening To Your Voice"
                  : "Voice Companion Ready"
              }
            />
          </div>

          {/* Voice Model & Latency Telemetry Card */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-[11px] space-y-2.5">
            <div className="flex items-center justify-between text-white/70">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-rose-400" /> Voice Engine:
              </span>
              <span className="font-semibold text-rose-300">
                {voiceEngineInfo.hasElevenLabs
                  ? "ElevenLabs Multilingual v2 ✨"
                  : "Native Indian Hindi (hi-IN)"}
              </span>
            </div>
            <div className="flex items-center justify-between text-white/50 text-[10px]">
              <span>Active Voice:</span>
              <span className="text-emerald-400 font-medium truncate max-w-[170px]">
                {availableVoices.find((v) => v.id === selectedVoiceId)?.name?.split("(")[0]?.trim() || "Custom Voice"}
              </span>
            </div>
            <div className="flex items-center justify-between text-white/50 text-[10px]">
              <span>Real-Time Waveform:</span>
              <span className="text-emerald-400 font-mono">
                {isSpeaking ? "Active (Audio PCM)" : isListening ? "Microphone Feed" : "44.1 kHz Idle"}
              </span>
            </div>

            {voiceNotice && (
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] flex items-start gap-1.5 leading-snug">
                <Info className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span>{voiceNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => testVoiceAudio()}
                disabled={isTestingVoice}
                className="py-2 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
              >
                <Volume2 className={`w-3.5 h-3.5 text-rose-400 ${isTestingVoice ? "animate-spin" : "animate-pulse"}`} />
                <span>{isTestingVoice ? "Testing..." : "Test Voice"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVoiceModal(true)}
                className="py-2 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-300" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex-1 h-full flex flex-col bg-[#0F0F0F] relative">
        {/* Header */}
        <div className="bg-[#0F0F0F]/85 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-white/5 shadow-sm z-20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden text-white/60 hover:text-white hover:bg-white/5 rounded-full -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 p-[1.5px]">
                <div className="w-full h-full rounded-full bg-[#0F0F0F] flex items-center justify-center overflow-hidden relative">
                  <Avatar className="w-full h-full border-none">
                    <AvatarImage
                      src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800"
                      style={{ filter: "grayscale(10%) contrast(110%)" }}
                    />
                    <AvatarFallback>AR</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0F0F0F] ${
                  isSpeaking ? "bg-rose-500 animate-pulse" : "bg-emerald-400"
                }`}
              />
            </div>
            <div>
              <div className="font-semibold text-white/90 leading-none text-sm flex items-center gap-2">
                Aria (Rem)
                {isSpeaking && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider animate-pulse">
                    Speaking Hindi
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                <span>{voiceEngineInfo.hasElevenLabs ? "ElevenLabs Voice" : "Native Hindi (hi-IN)"}</span>
                <span>•</span>
                <span className="text-rose-400/80">{voiceMode} Mode</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Header Mini Waveform Visualizer */}
            <div className="hidden sm:block">
              <WaveformVisualizer
                analyser={analyserNode}
                isSpeaking={isSpeaking}
                isListening={isListening}
                emotion={currentEmotionState || voiceMode.toLowerCase()}
                variant="compact"
              />
            </div>

            {/* Voice Settings Modal Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceModal(true)}
              className="text-rose-200/90 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 shadow-sm"
              title="Configure ElevenLabs Voice & Audio Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Voice Settings</span>
            </Button>

            {/* Persona Dropdown */}
            <select
              value={voiceMode}
              onChange={(e) => setVoiceMode(e.target.value)}
              className="bg-[#1A1A1A] text-rose-300/90 text-[10px] uppercase tracking-widest border border-rose-500/20 rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500/50 appearance-none cursor-pointer hover:bg-rose-500/10 transition-colors shadow-inner font-medium"
            >
              <option value="Romantic">Romantic</option>
              <option value="Whisper">Whisper</option>
              <option value="Excited">Excited</option>
              <option value="Sad">Emotional</option>
              <option value="Thinking">Thinking</option>
              <option value="Normal">Casual</option>
            </select>

            {/* Voice Mute / Unmute */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              className={`rounded-full h-9 w-9 ${
                voiceEnabled
                  ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.15)]"
                  : "text-white/40 border border-white/10 hover:bg-white/5"
              }`}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Real-time Floating Speech Waveform Banner */}
        <AnimatePresence>
          {(isSpeaking || isListening) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-neutral-900/95 border-b border-rose-500/20 backdrop-blur-md px-4 sm:px-6 py-2 flex items-center justify-between z-10 overflow-hidden shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isSpeaking ? "bg-rose-400" : "bg-cyan-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isSpeaking ? "bg-rose-500" : "bg-cyan-500"
                    }`}
                  />
                </span>
                <span className="text-xs text-rose-200 font-medium">
                  {isSpeaking
                    ? `Aria speaking in pure Hindi • [${currentEmotionState}]`
                    : "Listening to your voice in Hindi / Hinglish..."}
                </span>
              </div>

              <div className="w-32 sm:w-48 h-6">
                <WaveformVisualizer
                  analyser={analyserNode}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  emotion={currentEmotionState || voiceMode.toLowerCase()}
                  variant="badge"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto bg-[#0F0F0F]" ref={scrollRef}>
          <div className="p-4 sm:p-6 md:p-8 space-y-6 flex flex-col">
            <div className="text-center text-[9px] text-white/20 uppercase tracking-[0.3em] my-2 font-medium">
              Today,{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                hour: "numeric",
                minute: "numeric",
              })}
            </div>

            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${
                      isUser ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div
                      className={`px-5 py-3.5 text-sm leading-relaxed relative ${
                        isUser
                          ? "bg-white/5 border border-white/10 text-white/95 rounded-2xl rounded-tr-none shadow-sm"
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-50 rounded-2xl rounded-tl-none shadow-lg shadow-rose-950/20"
                      }`}
                    >
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Message Listen / Replay button */}
                      {!isUser && !msg.isStreaming && (
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-rose-500/10 text-[10px]">
                          <button
                            type="button"
                            onClick={() => playSingleMessage(msg.content)}
                            className="flex items-center gap-1.5 text-rose-300/80 hover:text-rose-200 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-rose-500/10"
                            title="Play message with ElevenLabs Hindi voice"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Listen in Hindi Voice</span>
                          </button>
                        </div>
                      )}

                      {/* Speaking / Streaming Indicator with mini waveform */}
                      {msg.isStreaming && (
                        <div className="flex mt-3 items-center justify-between gap-3 pt-2 border-t border-rose-500/10">
                          <div className="flex gap-1.5 items-center bg-black/40 px-2.5 py-1 rounded-full border border-rose-500/20">
                            <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping" />
                            <span className="text-[9px] text-rose-300 tracking-wider font-semibold uppercase">
                              Speaking Pure Hindi
                            </span>
                          </div>
                          <div className="w-20 h-4">
                            <WaveformVisualizer
                              analyser={analyserNode}
                              isSpeaking={isSpeaking}
                              isListening={false}
                              emotion={currentEmotionState}
                              variant="badge"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-1 px-1 justify-end w-full">
                      <span className="text-[9px] text-white/30 uppercase tracking-wider">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isUser && (
                        <CheckCheck className="w-3 h-3 text-rose-400" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="self-start items-start flex gap-3 opacity-70"
              >
                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex-shrink-0 border border-rose-500/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="bg-white/5 px-4 py-3 rounded-full flex gap-1.5 items-center border border-white/5">
                  <div
                    className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce"
                    style={{ animationDelay: "-0.3s" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce"
                    style={{ animationDelay: "-0.15s" }}
                  />
                  <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-gradient-to-t from-[#0A0A0A] to-transparent p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 relative max-w-4xl mx-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleListening}
              className={`absolute left-2 z-10 shrink-0 rounded-full h-10 w-10 transition-colors ${
                isListening
                  ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Mic
                className={`w-5 h-5 ${isListening ? "animate-pulse text-rose-400" : ""}`}
              />
            </Button>

            <Input
              value={
                input +
                (interimResult
                  ? (input && !input.endsWith(" ") ? " " : "") + interimResult
                  : "")
              }
              onChange={(e) => {
                let val = e.target.value;
                if (interimResult) {
                  val = val.replace(interimResult, "");
                }
                setInput(val);
                if (!isListening) setInterimResult("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type in Hindi or English, or tap mic to speak..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-6 pl-14 pr-16 focus-visible:ring-0 focus:outline-none focus:border-rose-500/50 transition-all text-sm placeholder:text-white/30 text-white shadow-xl backdrop-blur-md"
            />

            <Button
              onClick={handleSend}
              disabled={!input.trim() && !interimResult.trim()}
              className={`absolute right-2 z-10 shrink-0 rounded-full h-10 w-10 transition-transform ${
                input.trim() || interimResult.trim()
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 hover:scale-105"
                  : "bg-white/10 text-white/30"
              }`}
              size="icon"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>

          {/* Telemetry and Feature Badges */}
          <div className="mt-3 flex justify-center gap-3 sm:gap-6 flex-wrap text-center">
            <span className="text-[9px] uppercase tracking-[0.25em] text-white/30 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSpeaking
                    ? "bg-rose-500 animate-pulse"
                    : voiceEnabled
                    ? "bg-emerald-400"
                    : "bg-neutral-600"
                }`}
              />
              Voice: {voiceEnabled ? (voiceEngineInfo.hasElevenLabs ? "ElevenLabs Multilingual v2" : "Native Indian Hindi") : "Muted"}
            </span>

            <span className="text-[9px] uppercase tracking-[0.25em] text-white/30 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSpeaking || isListening ? "bg-rose-400 animate-ping" : "bg-white/20"
                }`}
              />
              Waveform: {isSpeaking ? "Active Speaking" : isListening ? "Active Listening" : "Live Visualizer"}
            </span>

            <span className="text-[9px] uppercase tracking-[0.25em] text-white/30">
              Accent: Pure Hindi (Indian)
            </span>
          </div>
        </div>
      </div>

      {/* Voice Settings & Configuration Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg bg-[#141414] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Voice & ElevenLabs Audio Settings
                    </h2>
                    <p className="text-[11px] text-white/50">
                      Configure authentic Indian Hindi companion voices
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowVoiceModal(false)}
                  className="rounded-full text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 text-xs text-white/80">
                {/* Status Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-950/20 to-black/40 border border-rose-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white/90 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      ElevenLabs Multilingual v2
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        voiceEngineInfo.hasElevenLabs
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {voiceEngineInfo.hasElevenLabs ? "Active Engine" : "Needs API Key"}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Aria speaks naturally in authentic Indian Hindi with subtle pauses, affectionate tone, and real-time waveform sync.
                  </p>
                </div>

                {/* Voice Selection List */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center justify-between">
                    <span>Select Companion Voice</span>
                    <span className="text-rose-400 lowercase font-normal">click to preview</span>
                  </label>
                  <div className="space-y-2">
                    {availableVoices.map((voice) => {
                      const isSelected = selectedVoiceId === voice.id;
                      return (
                        <div
                          key={voice.id}
                          onClick={() => {
                            setSelectedVoiceId(voice.id);
                            localStorage.setItem("aria_selected_voice_id", voice.id);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-rose-500/15 border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.1)]"
                              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                          }`}
                        >
                          <div className="space-y-0.5 pr-2">
                            <div className="font-semibold text-white/90 flex items-center gap-2">
                              {voice.name}
                              {voice.type === "custom" && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Your Custom Voice
                                </span>
                              )}
                              {voice.type === "recommended" && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Free Tier Compatible
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/50">{voice.description}</p>
                            <p className="text-[9px] font-mono text-white/30 pt-0.5">ID: {voice.id}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Voice ID Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Use Any ElevenLabs Voice ID (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Paste any ElevenLabs Voice ID from your Voice Lab..."
                      value={customVoiceInput}
                      onChange={(e) => setCustomVoiceInput(e.target.value)}
                      className="bg-[#0A0A0A] border-white/15 text-white text-xs placeholder:text-white/30 h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (customVoiceInput.trim()) {
                          const id = customVoiceInput.trim();
                          setSelectedVoiceId(id);
                          localStorage.setItem("aria_selected_voice_id", id);
                          setAvailableVoices((prev) => [
                            ...prev.filter((v) => v.id !== id),
                            {
                              id,
                              name: `Custom Voice (${id.slice(0, 8)}...)`,
                              description: "Custom user-provided ElevenLabs voice ID",
                              type: "custom",
                            },
                          ]);
                          setCustomVoiceInput("");
                        }
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-9 px-3 shrink-0"
                    >
                      Apply ID
                    </Button>
                  </div>
                </div>

                {/* Vercel & Client API Key Option */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center justify-between">
                    <span>ElevenLabs API Key (Vercel Preview / Direct)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">
                      {voiceEngineInfo.hasElevenLabs ? "Server Key Active" : "Optional"}
                    </span>
                  </label>
                  <Input
                    type="password"
                    placeholder={
                      voiceEngineInfo.hasElevenLabs
                        ? "Server key detected. Paste a custom key only to override..."
                        : "Enter your ElevenLabs API Key..."
                    }
                    value={clientApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientApiKey(val);
                      localStorage.setItem("aria_elevenlabs_api_key", val);
                    }}
                    className="bg-[#0A0A0A] border-white/15 text-white text-xs placeholder:text-white/30 h-9"
                  />
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    On Vercel, you can also set <code className="text-rose-300 font-mono">ELEVENLABS_API_KEY</code> in Project Settings &rarr; Environment Variables.
                  </p>
                </div>

                {/* Free Tier Notice Info */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-300 text-[11px]">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>How ElevenLabs Voice Access Works</span>
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    • <strong>Free Tier:</strong> ElevenLabs restricts community Voice Library IDs (like Nishi) on free API accounts. If your configured voice returns 402, Aria automatically routes to <strong>Lily / Jessica (Multilingual v2)</strong> so you always get natural, sweet Indian Hindi speech without a robotic fallback.<br />
                    • <strong>Starter/Paid Plans or Cloned Voices:</strong> Custom Library IDs and cloned voices are supported directly via API without restrictions.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testVoiceAudio(selectedVoiceId)}
                  disabled={isTestingVoice}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5 h-9"
                >
                  <Play className={`w-3.5 h-3.5 ${isTestingVoice ? "animate-spin" : ""}`} />
                  <span>{isTestingVoice ? "Playing Sample..." : "Test Selected Voice"}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setShowVoiceModal(false)}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs h-9 px-5 shadow-lg shadow-rose-900/30"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
