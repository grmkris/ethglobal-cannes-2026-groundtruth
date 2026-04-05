import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { COLORS, FONTS } from "../config/theme";

export const DisputeScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Phase 1: Event detail screenshot (0-250)
  const img1Opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const img1Fade = interpolate(frame, [210, 260], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img1Scale = interpolate(frame, [0, 260], [1, 1.06], { extrapolateRight: "clamp" });

  // Phase 2: Trust network (250-end)
  const img2Opacity = interpolate(frame, [230, 270], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img2Scale = interpolate(frame, [250, 481], [1, 1.05], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Bottom text
  const textOpacity = interpolate(frame, [300, 340], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Confidence formula (fills dead zone 360-481)
  const formulaOpacity = interpolate(frame, [360, 400], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}>
      {/* Phase 1: Event detail */}
      <AbsoluteFill style={{ opacity: img1Opacity * img1Fade }}>
        <Img
          src={staticFile("images/event-detail.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${img1Scale})`, transformOrigin: "center center" }}
        />
      </AbsoluteFill>

      {/* Phase 2: Trust network */}
      <AbsoluteFill style={{ opacity: img2Opacity }}>
        <Img
          src={staticFile("images/promp3.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${img2Scale})`, transformOrigin: "center center" }}
        />
        <AbsoluteFill style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }} />
      </AbsoluteFill>

      {/* Bottom text */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: textOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            padding: "14px 36px",
            borderRadius: 8,
            border: `1px solid ${COLORS.emerald}40`,
          }}
        >
          <span style={{ color: COLORS.white, fontSize: 24, fontWeight: 600 }}>
            Truth isn't declared
          </span>
          <span style={{ color: COLORS.emerald, fontSize: 24, fontWeight: 600 }}>
            {" "}-- it's earned
          </span>
        </div>
      </div>

      {/* Confidence formula */}
      {frame >= 360 && (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: formulaOpacity,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            padding: "10px 28px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ color: COLORS.gray, fontSize: 18 }}>Confidence =</span>
          <span style={{ color: COLORS.emerald, fontSize: 18 }}>Verification</span>
          <span style={{ color: COLORS.gray, fontSize: 18 }}>+</span>
          <span style={{ color: COLORS.erc8004, fontSize: 18 }}>Corroboration</span>
          <span style={{ color: COLORS.gray, fontSize: 18 }}>-</span>
          <span style={{ color: COLORS.critical, fontSize: 18 }}>Disputes</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
