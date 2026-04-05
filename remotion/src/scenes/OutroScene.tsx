import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../config/theme";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line2Opacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line3Opacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleScale = spring({
    frame: Math.max(0, frame - 120),
    fps,
    config: { damping: 12 },
  });
  const titleOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONTS.mono,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, color: COLORS.worldId, opacity: line1Opacity, marginBottom: 16 }}>
          World ID proves who's reporting.
        </div>
        <div style={{ fontSize: 36, color: COLORS.ens, opacity: line2Opacity, marginBottom: 16 }}>
          ENS names who's watching.
        </div>
        <div style={{ fontSize: 36, color: COLORS.arc, opacity: line3Opacity, marginBottom: 48 }}>
          Arc pays for intelligence.
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
          }}
        >
          This is Ground Truth.
        </div>
        <div
          style={{
            fontSize: 22,
            color: COLORS.muted,
            opacity: titleOpacity,
            marginTop: 24,
          }}
        >
          ETHGlobal Cannes 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};
