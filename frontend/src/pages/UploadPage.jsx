import React, { useState, useRef } from "react";
import { Upload, Music, Image as ImageIcon, FileText, Play } from "lucide-react";
import { toast } from "sonner";
import { parseLRC } from "@/lib/lrcParser";

const FileTile = ({ id, label, accept, file, onPick, icon: Icon, testId }) => {
  const inputRef = useRef(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group relative flex flex-col items-start gap-2 p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 transition-all duration-300 text-left"
      data-testid={`${testId}-tile`}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-widest text-white/50">
            {label}
          </div>
          <div className="text-sm text-white truncate mt-0.5">
            {file ? file.name : "Click to select"}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        id={id}
        data-testid={testId}
        type="file"
        accept={accept}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
        className="hidden"
      />
    </button>
  );
};

export default function UploadPage({ onStart, initialForm }) {
  const [artist, setArtist] = useState(initialForm?.artist || "");
  const [song, setSong] = useState(initialForm?.song || "");
  const [audio, setAudio] = useState(initialForm?.audio || null);
  const [art, setArt] = useState(initialForm?.art || null);
  const [lrc, setLrc] = useState(initialForm?.lrc || null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!artist.trim() || !song.trim()) {
      toast.error("Please enter both artist name and song name");
      return;
    }
    if (!audio || !art || !lrc) {
      toast.error("Please upload audio, album art and LRC file");
      return;
    }
    setLoading(true);
    try {
      const lrcText = await lrc.text();
      const lyrics = parseLRC(lrcText);
      if (lyrics.length === 0) {
        toast.error("No lyrics found in LRC file");
        setLoading(false);
        return;
      }
      const audioUrl = URL.createObjectURL(audio);
      const artUrl = URL.createObjectURL(art);
      onStart(
        {
          artist: artist.trim(),
          song: song.trim(),
          audioUrl,
          artUrl,
          lyrics,
        },
        { artist, song, audio, art, lrc },
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse LRC file");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-helvetica relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[160px] opacity-40"
          style={{ background: "rgb(180, 60, 200)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[160px] opacity-40"
          style={{ background: "rgb(60, 120, 220)" }}
        />
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-10">
            <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
              Lyric Studio
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[0.95]">
              Turn your track into a<br />
              <span className="italic font-light">cinematic lyric video.</span>
            </h1>
            <p className="mt-5 text-white/60 text-base md:text-lg max-w-xl">
              Upload your song, album art and an LRC file. We&apos;ll craft an Apple
              Music–style 1920 × 1080 karaoke experience with a living gradient
              made from your artwork.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
            data-testid="upload-form"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="artist"
                  className="text-xs uppercase tracking-widest text-white/50"
                >
                  Artist Name
                </label>
                <input
                  id="artist"
                  data-testid="upload-artist"
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g. Frank Ocean"
                  className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="song"
                  className="text-xs uppercase tracking-widest text-white/50"
                >
                  Song Name
                </label>
                <input
                  id="song"
                  data-testid="upload-song"
                  type="text"
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  placeholder="e.g. Pink + White"
                  className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FileTile
                id="audio-input"
                testId="upload-audio"
                label="Audio (mp3)"
                accept="audio/*"
                file={audio}
                onPick={setAudio}
                icon={Music}
              />
              <FileTile
                id="art-input"
                testId="upload-art"
                label="Album Art"
                accept="image/*"
                file={art}
                onPick={setArt}
                icon={ImageIcon}
              />
              <FileTile
                id="lrc-input"
                testId="upload-lrc"
                label="LRC Lyrics"
                accept=".lrc,text/plain"
                file={lrc}
                onPick={setLrc}
                icon={FileText}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="upload-submit"
              className="group relative overflow-hidden rounded-full bg-white text-black py-4 px-8 font-semibold text-base tracking-wide hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-black" strokeWidth={0} />
              {loading ? "Preparing..." : "Launch Player"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-white/40 text-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>
              Nothing is uploaded to a server. Everything plays locally in your
              browser.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
