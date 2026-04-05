import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../config/theme";

export const MapScene: React.FC = () => {
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
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            opacity: titleOpacity,
            marginBottom: 24,
          }}
        >
          The Map
        </div>
        <div
          style={{
            fontSize: 28,
            color: COLORS.emerald,
            opacity: titleOpacity,
          }}
        >
          Every pin is a world event
        </div>
      </div>
    </AbsoluteFill>
  );
};
