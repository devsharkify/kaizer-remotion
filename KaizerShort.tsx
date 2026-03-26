import React from "react";
import { AbsoluteFill, Composition, Img, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// ── Types ──
export interface WordTimestamp { word: string; start: number; end: number; }
export interface KaizerClipProps {
  videoSrc: string;
  startSec: number;
  endSec: number;
  line1: string;
  line2: string;
  words: WordTimestamp[];
  ratio: "9:16" | "9:10" | "16:9";
  bottomImageSrc?: string;
}

// ── KaizerLogo ──
const KaizerLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200 }, durationInFrames: 20 });
  return (
    <div style={{ position: "absolute", top: 28, right: 28, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #ff3333, #cc0000)", border: "5px solid white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.7)", opacity, transform: `scale(${scale})`, zIndex: 50 }}>
      <span style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 38, color: "white", lineHeight: 1 }}>K</span>
      <span style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 16, color: "white", lineHeight: 1, letterSpacing: 2 }}>NEWS</span>
    </div>
  );
};

// ── VideoClip ──
const VideoClip: React.FC<{ src: string; startSec: number; heightPx: number }> = ({ src, startSec, heightPx }) => {
  const { width } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width, height: heightPx, overflow: "hidden", background: "#111" }}>
      <OffthreadVideo
        src={src}
        startFrom={Math.round(startSec * 30)}
        volume={1}
        style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", minHeight: "100%", objectFit: "cover" }}
      />
    </div>
  );
};

// ── BottomImage ──
const BottomImage: React.FC<{ src: string; topPx: number }> = ({ src, topPx }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: topPx, left: 0, width, height: height - topPx, overflow: "hidden", background: "#0a0a0a", opacity }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
    </div>
  );
};

// ── Torn edge paths ──
const TORN_TOP = `M0,20 C27,6 54,22 81,10 C108,1 135,18 162,8 C189,2 216,16 243,7 C270,1 297,17 324,8 C351,2 378,16 405,7 C432,1 459,17 486,8 C513,2 540,16 567,7 C594,1 621,17 648,8 C675,2 702,16 729,8 C756,1 783,17 810,8 C837,2 864,16 891,7 C918,1 945,17 972,8 C999,2 1026,16 1053,7 C1067,3 1074,11 1080,8 L1080,30 L0,30 Z`;
const tornBottom = (h: number) => `M0,${h-20} C27,${h-6} 54,${h-22} 81,${h-10} C108,${h-1} 135,${h-18} 162,${h-8} C189,${h-2} 216,${h-16} 243,${h-7} C270,${h-1} 297,${h-17} 324,${h-8} C351,${h-2} 378,${h-16} 405,${h-7} C432,${h-1} 459,${h-17} 486,${h-8} C513,${h-2} 540,${h-16} 567,${h-7} C594,${h-1} 621,${h-17} 648,${h-8} C675,${h-2} 702,${h-16} 729,${h-8} C756,${h-1} 783,${h-17} 810,${h-8} C837,${h-2} 864,${h-16} 891,${h-7} C918,${h-1} 945,${h-17} 972,${h-8} C999,${h-2} 1026,${h-16} 1053,${h-7} C1067,${h-3} 1074,${h-11} 1080,${h-8} L1080,${h+10} L0,${h+10} Z`;

// ── AnimatedStrip ──
const AnimatedStrip: React.FC<{ line1: string; line2: string; topPx: number; heightPx: number }> = ({ line1, line2, topPx, heightPx }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const ENTER = 12;
  const slide = spring({ frame: frame - ENTER, fps, config: { damping: 14, stiffness: 160 }, durationInFrames: 25 });
  const translateY = interpolate(slide, [0, 1], [heightPx * 1.5, 0]);
  const l1Opacity = interpolate(frame, [ENTER+8, ENTER+18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const l2Spring = spring({ frame: frame - (ENTER+14), fps, config: { damping: 9, stiffness: 220 }, durationInFrames: 20 });
  const l2Opacity = interpolate(frame, [ENTER+14, ENTER+22], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{ position: "absolute", top: topPx, left: 0, width, height: heightPx, transform: `translateY(${translateY}px)`, zIndex: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#9a0000 0%,#E50914 45%,#9a0000 100%)" }} />
      <svg viewBox={`0 0 1080 ${heightPx}`} style={{ position: "absolute", top: -28, left: 0, width: "100%", height: heightPx + 32, pointerEvents: "none" }} preserveAspectRatio="none">
        <path d={TORN_TOP} fill="#000000" />
      </svg>
      <svg viewBox={`0 0 1080 ${heightPx}`} style={{ position: "absolute", bottom: -28, left: 0, width: "100%", height: heightPx + 32, pointerEvents: "none" }} preserveAspectRatio="none">
        <path d={tornBottom(heightPx)} fill="#000000" />
      </svg>
      <div style={{ position: "absolute", top: "26%", width: "100%", textAlign: "center", fontFamily: "sans-serif", fontWeight: 700, fontSize: 46, color: "white", textShadow: "0 2px 16px rgba(0,0,0,0.9)", opacity: l1Opacity, letterSpacing: 1, padding: "0 40px", lineHeight: 1.2 }}>
        {line1}
      </div>
      <div style={{ position: "absolute", top: "54%", width: "100%", textAlign: "center", fontFamily: "sans-serif", fontWeight: 900, fontSize: 56, color: "#FFD700", textShadow: "0 3px 20px rgba(0,0,0,1)", opacity: l2Opacity, transform: `scale(${interpolate(l2Spring, [0, 1], [0.6, 1])})`, transformOrigin: "center center", letterSpacing: 1, padding: "0 40px", lineHeight: 1.2 }}>
        {line2}
      </div>
    </div>
  );
};

// ── WordCaptions ──
const WordCaptions: React.FC<{ words: WordTimestamp[]; startSec: number; bottomPx: number }> = ({ words, startSec, bottomPx }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  if (!words?.length) return null;
  const currentSec = startSec + frame / fps;
  const activeIdx = words.findIndex(w => currentSec >= w.start && currentSec <= w.end);
  const LINE_SIZE = 4;
  const activeGroup = activeIdx >= 0 ? Math.floor(activeIdx / LINE_SIZE) : -1;
  if (activeGroup < 0) return null;
  const groupStart = activeGroup * LINE_SIZE;
  const groupWords = words.slice(groupStart, groupStart + LINE_SIZE);

  return (
    <div style={{ position: "absolute", bottom: bottomPx, left: 0, width, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, padding: "20px 40px", zIndex: 30 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", borderRadius: 16 }} />
      {groupWords.map((w, i) => {
        const gIdx = groupStart + i;
        const isActive = gIdx === activeIdx;
        const isPast = gIdx < activeIdx;
        const wordFrame = Math.max(0, frame - Math.round((w.start - startSec) * fps));
        const wordScale = isActive ? spring({ frame: wordFrame, fps, config: { damping: 10, stiffness: 260 }, durationInFrames: 12 }) : 1;
        return (
          <span key={i} style={{ position: "relative", fontFamily: "sans-serif", fontWeight: isActive ? 900 : 700, fontSize: isActive ? 68 : 60, color: isActive ? "#FFD700" : isPast ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.85)", textShadow: isActive ? "0 2px 20px rgba(0,0,0,1)" : "0 2px 8px rgba(0,0,0,0.8)", transform: `scale(${wordScale})`, transformOrigin: "center bottom", display: "inline-block" }}>{w.word}</span>
        );
      })}
    </div>
  );
};

// ── KaizerShort (main composition) ──
const KaizerShort: React.FC<KaizerClipProps> = ({ videoSrc, startSec, endSec, line1, line2, words, ratio, bottomImageSrc }) => {
  const { width, height } = useVideoConfig();
  // ── Layout zones — matches kaizer_910_preview.html exactly ──
  let videoHeight: number, stripTop: number, stripHeight: number, imageTop: number, captionBottom: number;

  if (ratio === "9:16") {
    // 1080×1920 — video 53% = 1020px, strip at 885, image at 1170
    videoHeight  = 1020;
    stripTop     = 885;
    stripHeight  = 360;
    imageTop     = 1170;
    captionBottom = 420;
  } else if (ratio === "9:10") {
    // 1080×1200 — video 53% = 636px, strip at 590, image at 750
    videoHeight  = 636;
    stripTop     = 590;
    stripHeight  = 220;
    imageTop     = 740;
    captionBottom = 280;
  } else {
    // 1920×1080 — 16:9, full video, strip at bottom
    videoHeight  = height;
    stripTop     = height - 260;
    stripHeight  = 220;
    imageTop     = height;
    captionBottom = 280;
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <VideoClip src={videoSrc} startSec={startSec} heightPx={videoHeight} />
      {bottomImageSrc && ratio !== "16:9" && <BottomImage src={bottomImageSrc} topPx={imageTop} />}
      {words?.length > 0 && <WordCaptions words={words} startSec={startSec} bottomPx={captionBottom} />}
      <AnimatedStrip line1={line1} line2={line2} topPx={stripTop} heightPx={stripHeight} />
      <KaizerLogo />
    </AbsoluteFill>
  );
};

// ── Root ──
const DEFAULT: KaizerClipProps = {
  videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  startSec: 10, endSec: 40, line1: "FIRING RANGE MISUSE", line2: "ఫైరింగ్ రేంజ్ అవినీతి",
  words: [{ word: "ఫైరింగ్", start: 10.0, end: 10.8 }, { word: "రేంజ్లో", start: 10.8, end: 11.5 }],
  ratio: "9:16",
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="KaizerShort-916" component={KaizerShort} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={DEFAULT} />
    <Composition id="KaizerShort-910" component={KaizerShort} durationInFrames={900} fps={30} width={1080} height={1200} defaultProps={{ ...DEFAULT, ratio: "9:10" }} />
    <Composition id="KaizerShort-169" component={KaizerShort} durationInFrames={900} fps={30} width={1920} height={1080} defaultProps={{ ...DEFAULT, ratio: "16:9" }} />
  </>
);
