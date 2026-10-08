import React, { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  analyser?: AnalyserNode | null;
  isSpeaking: boolean;
  isListening?: boolean;
  emotion?: string;
  variant?: "hero" | "compact" | "badge";
  className?: string;
  label?: string;
}

export function WaveformVisualizer({
  analyser,
  isSpeaking,
  isListening = false,
  emotion = "romantic",
  variant = "hero",
  className = "",
  label,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let timeDomainBuffer: Uint8Array | null = null;
    let frequencyBuffer: Uint8Array | null = null;
    if (analyser) {
      timeDomainBuffer = new Uint8Array(analyser.fftSize);
      frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);
    }

    const render = () => {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      let realAmplitude = 0;

      // Extract real audio data from AnalyserNode if present
      if (analyser && timeDomainBuffer && frequencyBuffer && isSpeaking) {
        analyser.getByteTimeDomainData(timeDomainBuffer);
        analyser.getByteFrequencyData(frequencyBuffer);

        let sumSquares = 0;
        for (let i = 0; i < timeDomainBuffer.length; i++) {
          const val = (timeDomainBuffer[i] - 128) / 128;
          sumSquares += val * val;
        }
        const rms = Math.sqrt(sumSquares / timeDomainBuffer.length);
        realAmplitude = Math.min(1, rms * 3.5);
      }

      // Smooth amplitude transitions
      const targetLevel = realAmplitude > 0.02 ? realAmplitude : (isSpeaking ? 0.75 : isListening ? 0.6 : 0.08);
      smoothedLevelRef.current += (targetLevel - smoothedLevelRef.current) * 0.15;
      const level = smoothedLevelRef.current;

      phaseRef.current += isSpeaking ? 0.12 : isListening ? 0.08 : 0.03;
      const phase = phaseRef.current;

      const centerY = height / 2;

      // Emotion-based color palette
      let primaryColor = "#F43F5E"; // rose-500
      let secondaryColor = "#EC4899"; // pink-500
      let accentColor = "#FB7185"; // rose-400
      let glowColor = "rgba(244, 63, 94, 0.4)";

      if (isListening) {
        primaryColor = "#06B6D4"; // cyan-500
        secondaryColor = "#3B82F6"; // blue-500
        accentColor = "#67E8F9"; // cyan-300
        glowColor = "rgba(6, 182, 212, 0.35)";
      } else if (emotion === "whisper") {
        primaryColor = "#C084FC"; // purple-400
        secondaryColor = "#818CF8"; // indigo-400
        accentColor = "#DDD6FE";
        glowColor = "rgba(192, 132, 252, 0.3)";
      } else if (emotion === "excited") {
        primaryColor = "#FB923C"; // orange-400
        secondaryColor = "#F43F5E"; // rose-500
        accentColor = "#FDE047"; // yellow-300
        glowColor = "rgba(251, 146, 60, 0.45)";
      } else if (emotion === "romantic") {
        primaryColor = "#FB7185"; // rose-400
        secondaryColor = "#F43F5E"; // rose-500
        accentColor = "#FDA4AF"; // rose-300
        glowColor = "rgba(244, 63, 94, 0.5)";
      }

      // 1. Draw subtle background glow & gradient
      const bgGrad = ctx.createRadialGradient(width / 2, centerY, 5, width / 2, centerY, width / 2);
      bgGrad.addColorStop(0, glowColor);
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Waveform Layers
      const drawWave = (
        amplitude: number,
        frequency: number,
        offsetPhase: number,
        strokeColor: string,
        lineWidth: number,
        blur: number
      ) => {
        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeColor;
        ctx.shadowBlur = blur;
        ctx.shadowColor = strokeColor;

        const points = 80;
        const step = width / points;

        for (let i = 0; i <= points; i++) {
          const x = i * step;
          const normalizedX = (i / points) * Math.PI * 2;
          
          // Windowing function (Hanning window) to taper edges smoothly at borders
          const windowWeight = Math.sin((i / points) * Math.PI);

          let yOffset = 0;
          if (timeDomainBuffer && isSpeaking && realAmplitude > 0.05) {
            // Sample real PCM time-domain values
            const sampleIdx = Math.floor((i / points) * (timeDomainBuffer.length / 2));
            const pcmVal = (timeDomainBuffer[sampleIdx] - 128) / 128;
            yOffset = pcmVal * (height * 0.42) * windowWeight;
          } else {
            // Multi-harmonic vocal physics simulation
            const harmonic1 = Math.sin(normalizedX * frequency + phase + offsetPhase);
            const harmonic2 = Math.cos(normalizedX * (frequency * 1.6) - phase * 0.8) * 0.4;
            const harmonic3 = Math.sin(normalizedX * 0.5 + phase * 1.5) * 0.2;
            yOffset = (harmonic1 + harmonic2 + harmonic3) * amplitude * windowWeight;
          }

          const y = centerY + yOffset;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      // Primary Wave
      const maxAmp = (height * 0.38) * (isSpeaking ? Math.max(0.35, level) : isListening ? 0.28 : 0.08);
      
      // Secondary Harmonic Wave
      drawWave(maxAmp * 0.65, 2.8, Math.PI * 0.4, secondaryColor, 2, 8);
      // Accent High-frequency Wave
      drawWave(maxAmp * 0.4, 4.2, Math.PI * 0.9, accentColor, 1.5, 4);
      // Center Bold Wave
      drawWave(maxAmp, 2.1, 0, primaryColor, 2.5, 12);

      // 3. Draw dancing mini frequency bars across the center if in hero variant
      if (variant === "hero" && isSpeaking) {
        ctx.shadowBlur = 0;
        const barCount = 28;
        const barWidth = 3;
        const barSpacing = (width - 60) / barCount;
        const startX = 30;

        for (let b = 0; b < barCount; b++) {
          const bx = startX + b * barSpacing;
          let barHeight = 0;
          if (frequencyBuffer && realAmplitude > 0.05) {
            const freqIndex = Math.min(frequencyBuffer.length - 1, Math.floor((b / barCount) * 48));
            barHeight = (frequencyBuffer[freqIndex] / 255) * (height * 0.28);
          } else {
            const barFreq = Math.sin(b * 0.4 + phase * 2) * 0.5 + 0.5;
            barHeight = barFreq * (height * 0.25) * level;
          }

          if (barHeight > 2) {
            const barGrad = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
            barGrad.addColorStop(0, accentColor);
            barGrad.addColorStop(0.5, primaryColor);
            barGrad.addColorStop(1, secondaryColor);
            ctx.fillStyle = barGrad;
            
            // Draw symmetric pill bar
            const radius = barWidth / 2;
            const topY = centerY - barHeight;
            const bHeight = barHeight * 2;
            
            ctx.beginPath();
            ctx.roundRect(bx - radius, topY, barWidth, Math.max(barWidth, bHeight), radius);
            ctx.fill();
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    // Handle high DPI
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [analyser, isSpeaking, isListening, emotion, variant]);

  if (variant === "compact") {
    return (
      <div className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md ${className}`}>
        <div className="relative w-20 h-6 overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
          {isSpeaking ? "Speaking" : isListening ? "Listening" : "Rem Ready"}
        </span>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-2xl bg-neutral-950/80 border border-white/10 p-4 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Background glow orb */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSpeaking
                  ? "bg-rose-400"
                  : isListening
                  ? "bg-cyan-400"
                  : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isSpeaking
                  ? "bg-rose-500"
                  : isListening
                  ? "bg-cyan-500"
                  : "bg-emerald-500"
              }`}
            />
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90">
            {label || (isSpeaking ? "Aria Speaking" : isListening ? "Listening to You" : "Voice Idle")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase tracking-widest text-rose-300 font-medium">
          <span>{emotion}</span>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative w-full h-24 my-1 overflow-hidden rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Footer Metrics */}
      <div className="relative z-10 mt-2 flex items-center justify-between text-[10px] text-white/40 tracking-wider">
        <div className="flex items-center gap-1">
          <span className="text-white/60 font-mono">44.1 kHz</span>
          <span>•</span>
          <span className="text-rose-400/80 font-medium">Waveform Active</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="capitalize">{emotion} Mode</span>
        </div>
      </div>
    </div>
  );
}
