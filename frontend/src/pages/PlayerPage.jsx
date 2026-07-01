import React, { useEffect, useRef, useState, useMemo } from "react";
import { Play, Pause, ArrowLeft, Maximize2 } from "lucide-react";
import MeshGradient from "@/components/MeshGradient";
import { extractColors } from "@/lib/colorExtractor";

export default function PlayerPage({ session, onBack }) {
  const { artist, song, audioUrl, artUrl, lyrics } = session;

  const audioRef = useRef(null);
  const lyricsRef = useRef(null);
  const lineRefs = useRef([]);
  const canvasRef = useRef(null);

  const [colors, setColors] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);

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

  const showIntro = activeIndex < 0;

  const fmt = (s) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-0 md:p-6 font-helvetica"
      onMouseMove={() => setShowControls(true)}
      data-testid="player-page"
    >
      {/* 1920x1080 canvas */}
      <div
        ref={canvasRef}
        className="relative w-full max-w-[1920px] aspect-video overflow-hidden bg-black md:rounded-3xl ring-1 ring-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
        data-testid="player-canvas"
      >
        {/* Mesh gradient bg */}
        <MeshGradient colors={colors} />

        {/* INTRO SCREEN */}
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center px-[6%] transition-opacity duration-[900ms] ease-out ${
            showIntro ? "opacity-100" : "opacity-0 pointer-events-none"
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
                className="text-white/70 text-lg md:text-2xl uppercase tracking-[0.35em] mb-4"
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
          className={`absolute inset-0 z-10 transition-opacity duration-[900ms] ease-out ${
            showIntro ? "opacity-0" : "opacity-100"
          }`}
          data-testid="lyric-view"
        >
          <div
            ref={lyricsRef}
            className="w-full h-full overflow-y-auto no-scrollbar lyric-mask px-[6%]"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="py-[45%] flex flex-col gap-8">
              {lyrics.map((line, i) => {
                const isActive = i === activeIndex;
                const isNear = Math.abs(i - activeIndex) <= 1;
                const isPast = i < activeIndex;
                return (
                  <div
                    key={i}
                    ref={(el) => (lineRefs.current[i] = el)}
                    data-testid={isActive ? "lyric-line-active" : "lyric-line"}
                    className={`transition-all duration-700 ease-out will-change-transform origin-left break-words leading-[1.05] tracking-tight ${
                      isActive
                        ? "text-white text-6xl md:text-7xl lg:text-8xl font-bold opacity-100 scale-100"
                        : isNear
                          ? "text-white/80 text-4xl md:text-5xl lg:text-6xl font-bold opacity-70 scale-[0.98]"
                          : "text-white/50 text-3xl md:text-4xl lg:text-5xl font-bold opacity-40 scale-[0.94]"
                    } ${isPast && !isActive ? "opacity-30" : ""} ${
                      !line.text ? "h-4" : ""
                    }`}
                    style={{
                      textShadow: isActive
                        ? "0 8px 40px rgba(0,0,0,0.4)"
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
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-500 ${
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
          </div>
        </div>

        <audio ref={audioRef} src={audioUrl} data-testid="audio-element" />
      </div>
    </div>
  );
}
