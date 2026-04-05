import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../config/theme";

export const WorldIdScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONTS.mono,
      }}
    >
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: COLORS.worldId,
            opacity: titleOpacity,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          Layer 1
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            opacity: titleOpacity,
            marginBottom: 24,
          }}
        >
          Proof of Human
        </div>
        <div
          style={{
            fontSize: 28,
            color: COLORS.gray,
            opacity: titleOpacity,
          }}
        >
          World ID 4.0 -- Sybil-resistant by default
        </div>
      </div>
    </AbsoluteFill>
  );
};
