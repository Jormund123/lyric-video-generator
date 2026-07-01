import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Play, Pause, ArrowLeft, Maximize2, Download, Circle, Square } from "lucide-react";
import { toast } from "sonner";
import MeshGradient from "@/components/MeshGradient";
import { extractColors } from "@/lib/colorExtractor";

export default function PlayerPage({ session, onBack }) {
  const { artist, song, audioUrl, artUrl, lyrics } = session;

  const audioRef = useRef(null);
  const lyricsRef = useRef(null);
  const lineRefs = useRef([]);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioDestRef = useRef(null);
  const recorderRef = useRef(null);
  const displayStreamRef = useRef(null);

  const [colors, setColors] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState(false);

  const firstLyricTime = useMemo(
    () => (lyrics.length > 0 ? lyrics[0].time : 0),
    [lyrics],
  );

  // Extract colors from album art on mount
  useEffect(() => {
    let mounted = true;
    extractColors(artUrl, 5)
      .then((c) => {
        if (mounted) setColors(c);
      })
      .catch(() => {
        if (mounted)
          setColors([
            "rgb(120, 60, 200)",
            "rgb(60, 120, 220)",
            "rgb(230, 90, 120)",
            "rgb(90, 200, 180)",
            "rgb(240, 170, 80)",
          ]);
      });
    return () => {
      mounted = false;
    };
  }, [artUrl]);

  // Compute active lyric index
  const activeIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    // Only show lyrics once we've passed the first lyric time
    if (currentTime < firstLyricTime - 0.1) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime + 0.02) idx = i;
      else break;
    }
    return idx;
  }, [currentTime, lyrics, firstLyricTime]);

  // Auto scroll active lyric to center
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = lineRefs.current[activeIndex];
    const container = lyricsRef.current;
    if (!el || !container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset =
      el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top: offset, behavior: "smooth" });
    // suppress unused warnings
    void containerRect;
    void elRect;
  }, [activeIndex]);

  // Audio event bindings
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMeta = () => setDuration(a.duration || 0);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  // Auto hide controls
  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      return;
    }
    const t = setTimeout(() => setShowControls(false), 2500);
    return () => clearTimeout(t);
  }, [playing, currentTime]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const requestFullscreen = () => {
    const el = canvasRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * duration;
  };

  // Set up audio graph so we can capture the audio stream for recording
  const ensureAudioCapture = useCallback(() => {
    if (audioDestRef.current) return audioDestRef.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !audioRef.current) return null;
    const ctx = new AC();
    const source = ctx.createMediaElementSource(audioRef.current);
    const dest = ctx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(ctx.destination); // still play through speakers
    audioCtxRef.current = ctx;
    audioDestRef.current = dest;
    return dest;
  }, []);

  const pickMimeType = () => {
    const candidates = [
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return "";
  };

  const startRecording = async () => {
    if (recording) return;
    if (!audioRef.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Recording not supported in this browser. Try Chrome/Edge.");
      return;
    }
    const a = audioRef.current;
    let uiApplied = false;
    try {
      a.currentTime = 0;
      const dest = ensureAudioCapture();
      if (!dest) {
        toast.error("Audio capture not available");
        return;
      }

      // STEP 1: Apply recording layout FIRST so the tab visually shows only
      // the lyric canvas (watermark, controls, badges hidden; canvas fills
      // 100vw x 100vh) BEFORE the capture stream starts sampling frames.
      document.body.setAttribute("data-recording", "true");
      uiApplied = true;
      const prevTitle = document.title;
      document.title = `● REC — ${song || "Lyric Video"}`;

      // Wait 2 animation frames + a short paint delay so the browser has
      // definitely committed the layout change before we open the picker.
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      await new Promise((r) => setTimeout(r, 120));

      toast.info("Choose 'This tab' when prompted", { duration: 3500 });

      // STEP 2: Now request tab capture — the picker preview and the first
      // captured frames will show the already-transformed layout.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
      });
      displayStreamRef.current = display;

      // Small settle delay to make sure the capture is producing frames of
      // the recording layout (not any transient picker state).
      await new Promise((r) => setTimeout(r, 250));

      const combined = new MediaStream([
        ...display.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
      const mime = pickMimeType();
      const rec = new MediaRecorder(combined, {
        mimeType: mime || undefined,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 192_000,
      });
      const chunks = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mime || "video/webm" });
        const url = URL.createObjectURL(blob);
        const ext = mime.includes("mp4") ? "mp4" : "webm";
        const link = document.createElement("a");
        link.href = url;
        link.download = `${song || "lyric-video"}-${artist || "artist"}.${ext}`.replace(
          /[^\w.\-]+/g,
          "_",
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        display.getTracks().forEach((t) => t.stop());
        displayStreamRef.current = null;
        setRecording(false);
        // Restore UI state
        document.body.removeAttribute("data-recording");
        if (recorderRef.current?._prevTitle) {
          document.title = recorderRef.current._prevTitle;
        }
        toast.success(`Downloaded as .${ext}`);
      };
      // If user stops sharing from browser UI
      display.getVideoTracks()[0].addEventListener("ended", () => {
        if (rec.state !== "inactive") rec.stop();
      });
      // Auto stop when audio ends
      const onEnded = () => {
        if (rec.state !== "inactive") rec.stop();
        a.removeEventListener("ended", onEnded);
      };
      a.addEventListener("ended", onEnded);
      recorderRef.current = rec;
      recorderRef.current._prevTitle = prevTitle;
      rec.start(200);
      setRecording(true);
      await a.play();
      toast.success("Recording... press ESC (or stop-share) to finish", {
        duration: 4500,
      });
    } catch (err) {
      console.error(err);
      // Revert UI on failure/cancel
      if (uiApplied) {
        document.body.removeAttribute("data-recording");
        document.title = "Emergent | Fullstack App";
      }
      if (err?.name !== "NotAllowedError") {
        toast.error("Could not start recording");
      }
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      document.body.removeAttribute("data-recording");
    };
  }, []);

  // Keyboard shortcut: Esc stops the recording (UI is hidden during recording)
  useEffect(() => {
    if (!recording) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording]);

  const showIntro = activeIndex < 0;

  const fmt = (s) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="player-shell w-full min-h-screen bg-black flex flex-col items-center justify-center p-0 md:p-6 font-helvetica"
      onMouseMove={() => setShowControls(true)}
      data-testid="player-page"
    >
      {/* 1920x1080 canvas */}
      <div
        ref={canvasRef}
        className="player-canvas relative w-full max-w-[1920px] aspect-video overflow-hidden bg-black md:rounded-3xl ring-1 ring-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
        data-testid="player-canvas"
      >
        {/* Mesh gradient bg */}
        <MeshGradient colors={colors} />

        {/* INTRO SCREEN */}
        <div
          className={`intro-layer absolute inset-0 z-20 flex items-center justify-center px-[6%] ${
            showIntro ? "intro-in" : "intro-out"
          }`}
          data-testid="intro-screen"
        >
          <div className="flex items-center gap-[5%] w-full">
            <img
              src={artUrl}
              alt="Album Art"
              className="w-[38%] max-w-[520px] aspect-square object-cover rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
              data-testid="intro-art"
            />
            <div className="flex-1 min-w-0">
              <div
                className="text-white/80 text-lg md:text-2xl uppercase tracking-[0.35em] mb-4"
                data-testid="intro-artist"
              >
                {artist}
              </div>
              <div
                className="text-white font-bold tracking-tight leading-[0.95] text-5xl md:text-7xl lg:text-8xl break-words"
                data-testid="intro-song"
                style={{ textShadow: "0 6px 40px rgba(0,0,0,0.4)" }}
              >
                {song}
              </div>
            </div>
          </div>
        </div>

        {/* LYRIC VIEW */}
        <div
          className={`lyric-layer absolute inset-0 z-10 ${
            showIntro ? "lyric-out" : "lyric-in"
          }`}
          data-testid="lyric-view"
        >
          <div
            ref={lyricsRef}
            className="w-full h-full overflow-y-auto no-scrollbar lyric-mask px-[6%]"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="py-[45%] flex flex-col gap-6">
              {lyrics.map((line, i) => {
                const isActive = i === activeIndex;
                const dist = activeIndex < 0 ? 99 : Math.abs(i - activeIndex);
                const isPast = i < activeIndex;

                // Scale-only sizing — font-size is constant so wrapping never changes
                let scale = 0.7;
                let opacity = 0.28;
                let blurPx = 1.2;
                if (isActive) {
                  scale = 1;
                  opacity = 1;
                  blurPx = 0;
                } else if (dist === 1) {
                  scale = 0.82;
                  opacity = 0.6;
                  blurPx = 0.4;
                } else if (dist === 2) {
                  scale = 0.74;
                  opacity = 0.42;
                  blurPx = 0.8;
                }
                if (isPast && !isActive) opacity = Math.min(opacity, 0.28);

                return (
                  <div
                    key={i}
                    ref={(el) => (lineRefs.current[i] = el)}
                    data-testid={isActive ? "lyric-line-active" : "lyric-line"}
                    className={`lyric-line text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] tracking-tight break-words ${
                      !line.text ? "h-4" : ""
                    }`}
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                      filter: blurPx ? `blur(${blurPx}px)` : "none",
                      textShadow: isActive
                        ? "0 8px 40px rgba(0,0,0,0.45)"
                        : "none",
                    }}
                  >
                    {line.text || "\u00A0"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div
          className={`player-controls absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-500 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex items-center gap-4 bg-black/50 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/10">
            <button
              onClick={onBack}
              data-testid="back-button"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/70"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              data-testid={playing ? "pause-button" : "play-button"}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
              {playing ? (
                <Pause className="w-5 h-5 fill-black" strokeWidth={0} />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" strokeWidth={0} />
              )}
            </button>
            <div className="text-white/70 text-xs w-12 text-right tabular-nums">
              {fmt(currentTime)}
            </div>
            <div
              onClick={seek}
              className="w-64 md:w-96 h-1.5 bg-white/15 rounded-full cursor-pointer overflow-hidden"
              data-testid="progress-bar"
            >
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="text-white/70 text-xs w-12 tabular-nums">
              {fmt(duration)}
            </div>
            <button
              onClick={requestFullscreen}
              data-testid="fullscreen-button"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/70"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {recording ? (
              <button
                onClick={stopRecording}
                data-testid="stop-record-button"
                className="h-10 px-4 rounded-full flex items-center gap-2 bg-red-500/90 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
                title="Stop recording"
              >
                <Square className="w-3.5 h-3.5 fill-white" strokeWidth={0} />
                Stop
              </button>
            ) : (
              <button
                onClick={startRecording}
                data-testid="record-button"
                className="h-10 px-4 rounded-full flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/15"
                title="Record & download as MP4"
              >
                <Download className="w-3.5 h-3.5" />
                Record MP4
              </button>
            )}
          </div>
        </div>

        {recording && (
          <div
            className="recording-indicator absolute top-6 right-6 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-red-500/40"
            data-testid="recording-indicator"
          >
            <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500 rec-dot" strokeWidth={0} />
            <span className="text-white/90 text-xs font-semibold tracking-wide">
              REC
            </span>
          </div>
        )}

        <audio ref={audioRef} src={audioUrl} data-testid="audio-element" />
      </div>
    </div>
  );
}
