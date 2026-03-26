import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WordTimestamp } from "../types";

interface WordCaptionsProps {
  words: WordTimestamp[];
  startSec: number;   // clip start offset (timestamps are absolute)
  bottomPx: number;   // distance from bottom of canvas
}

export const WordCaptions: React.FC<WordCaptionsProps> = ({ words, startSec, bottomPx }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (!words || words.length === 0) return null;

  // Current time in the original video
  const currentSec = startSec + frame / fps;

  // Find active word
  const activeIdx = words.findIndex(
    (w) => currentSec >= w.start && currentSec <= w.end
  );

  // Group words into lines of ~4 words
  const LINE_SIZE = 4;
  const activeGroup = activeIdx >= 0 ? Math.floor(activeIdx / LINE_SIZE) : -1;

  if (activeGroup < 0) return null;

  const groupStart = activeGroup * LINE_SIZE;
  const groupWords = words.slice(groupStart, groupStart + LINE_SIZE);

  return (
    <div style={{
      position: "absolute",
      bottom: bottomPx,
      left: 0,
      width,
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      padding: "20px 40px",
      zIndex: 30,
    }}>
      {/* Semi-transparent background pill */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        borderRadius: 16,
      }} />

      {groupWords.map((w, i) => {
        const globalIdx = groupStart + i;
        const isActive = globalIdx === activeIdx;
        const isPast = globalIdx < activeIdx;

        // Spring pop for active word
        const wordFrame = Math.max(0, frame - Math.round((w.start - startSec) * fps));
        const wordScale = isActive
          ? spring({ frame: wordFrame, fps, config: { damping: 10, stiffness: 260 }, durationInFrames: 12 })
          : 1;

        return (
          <span
            key={i}
            style={{
              position: "relative",
              fontFamily: "sans-serif",
              fontWeight: isActive ? 900 : 700,
              fontSize: isActive ? 68 : 60,
              color: isActive ? "#FFD700" : isPast ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.85)",
              textShadow: isActive
                ? "0 2px 20px rgba(0,0,0,1), 0 0 40px rgba(255,200,0,0.4)"
                : "0 2px 8px rgba(0,0,0,0.8)",
              transform: `scale(${wordScale})`,
              transformOrigin: "center bottom",
              display: "inline-block",
              transition: "color 0.1s",
              letterSpacing: 0.5,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
