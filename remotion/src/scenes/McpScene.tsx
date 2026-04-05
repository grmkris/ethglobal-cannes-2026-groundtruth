import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../config/theme";

export const McpScene: React.FC = () => {
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
            color: COLORS.mcp,
            opacity: titleOpacity,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          Layer 3
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
          Any Agent Can Connect
        </div>
        <div
          style={{
            fontSize: 28,
            color: COLORS.emerald,
            opacity: titleOpacity,
          }}
        >
          npx groundtruth-mcp setup
        </div>
      </div>
    </AbsoluteFill>
  );
};
