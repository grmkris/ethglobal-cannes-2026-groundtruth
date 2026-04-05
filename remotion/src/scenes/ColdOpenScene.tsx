import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { COLORS, FONTS, SPRING } from "../config/theme";

export const ColdOpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Misinformation image (0-220)
  const imgOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(frame, [0, 220], [1, 1.08], { extrapolateRight: "clamp" });
  const imgDim = interpolate(frame, [180, 260], [0, 0.7], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 2: "Who do you trust?" (220-390)
  const questionScale = spring({ frame: Math.max(0, frame - 230), fps, config: SPRING.default });
  const questionOpacity = interpolate(frame, [220, 250], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const questionFade = interpolate(frame, [350, 390], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 3: Ground Truth title (390-end)
  const titleScale = spring({ frame: Math.max(0, frame - 400), fps, config: SPRING.default });
  const titleOpacity = interpolate(frame, [390, 420], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const underlineWidth = interpolate(frame, [440, 510], [0, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const subtitleOpacity = interpolate(frame, [490, 530], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Tail text (540-615)
  const humanOpacity = interpolate(frame, [540, 565], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const agentOpacity = interpolate(frame, [565, 590], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}>
      <AbsoluteFill style={{ opacity: imgOpacity }}>
        <Img src={staticFile("images/promp1.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${imgScale})` }} />
        <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${imgDim})` }} />
      </AbsoluteFill>

      {frame >= 220 && frame < 390 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 700, color: COLORS.white, opacity: questionOpacity * questionFade, transform: `scale(${questionScale})` }}>
            Who do you trust?
          </div>
        </AbsoluteFill>
      )}

      {frame >= 390 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", opacity: titleOpacity, transform: `scale(${titleScale})` }}>
            <div style={{ fontSize: 88, fontWeight: 800, color: COLORS.white, letterSpacing: 6 }}>GROUND TRUTH</div>
            <div style={{ height: 4, backgroundColor: COLORS.emerald, width: `${underlineWidth}%`, margin: "16px auto 0", borderRadius: 2 }} />
            <div style={{ fontSize: 26, color: COLORS.gray, marginTop: 24, opacity: subtitleOpacity, letterSpacing: 2 }}>Verified intelligence map</div>
            <div style={{ display: "flex", gap: 48, justifyContent: "center", marginTop: 48 }}>
              <div style={{ opacity: humanOpacity, color: COLORS.emerald, fontSize: 22 }}>Verified Humans</div>
              <div style={{ opacity: agentOpacity, color: COLORS.ens, fontSize: 22 }}>Accountable AI Agents</div>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
