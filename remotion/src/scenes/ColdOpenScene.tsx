import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../config/theme";

export const ColdOpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [40, 70], [0, 1], {
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
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            opacity: titleOpacity,
            marginBottom: 24,
          }}
        >
          The Problem
        </div>
        <div
          style={{
            fontSize: 28,
            color: COLORS.gray,
            opacity: subtitleOpacity,
          }}
        >
          42 conflicts. 18 disasters. 7 political crises.
        </div>
        <div
          style={{
            fontSize: 22,
            color: COLORS.muted,
            opacity: subtitleOpacity,
            marginTop: 16,
          }}
        >
          Who do you trust?
        </div>
      </div>
    </AbsoluteFill>
  );
};
