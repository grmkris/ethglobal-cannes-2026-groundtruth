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

export const AgentIdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 0: Title card (0-130)
  const layerScale = spring({ frame, fps, config: SPRING.default });
  const layerOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const layerFade = interpolate(frame, [90, 130], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 1: Agent identity art (120-310)
  const img1Opacity = interpolate(frame, [110, 140], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img1Fade = interpolate(frame, [270, 320], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img1Scale = interpolate(frame, [120, 320], [1, 1.06], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 2: ENS registration (300-620)
  const img2Opacity = interpolate(frame, [290, 320], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img2Fade = interpolate(frame, [580, 630], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img2Scale = interpolate(frame, [300, 630], [1, 1.05], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 3: Agent view (610-870)
  const img3Opacity = interpolate(frame, [600, 630], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img3Fade = interpolate(frame, [830, 880], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img3Scale = interpolate(frame, [610, 880], [1, 1.05], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 3.5: Statistics (860-1060)
  const img4Opacity = interpolate(frame, [850, 880], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img4Fade = interpolate(frame, [1020, 1070], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const img4Scale = interpolate(frame, [860, 1070], [1, 1.04], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 4: Text (1050-end)
  const textBgOpacity = interpolate(frame, [1040, 1070], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const textScale = spring({ frame: Math.max(0, frame - 1060), fps, config: SPRING.default });
  const textOpacity = interpolate(frame, [1050, 1080], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Labels
  const label2Opacity = interpolate(frame, [330, 360], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const label3Opacity = interpolate(frame, [640, 670], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const label4Opacity = interpolate(frame, [890, 920], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}>
      {frame < 140 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg }}>
          <div style={{ textAlign: "center", opacity: layerOpacity * layerFade, transform: `scale(${layerScale})` }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.ens, textTransform: "uppercase", letterSpacing: 6, marginBottom: 16 }}>Layer 2</div>
            <div style={{ fontSize: 64, fontWeight: 700, color: COLORS.white }}>On-Chain Agent Identity</div>
            <div style={{ fontSize: 24, color: COLORS.gray, marginTop: 16 }}>ENS + ERC-8004 + Arc x402</div>
          </div>
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ opacity: img1Opacity * img1Fade }}>
        <Img src={staticFile("images/promp4.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${img1Scale})`, transformOrigin: "center center" }} />
        <AbsoluteFill style={{ backgroundColor: "rgba(0, 0, 0, 0.15)" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: img2Opacity * img2Fade }}>
        <Img src={staticFile("images/ens-agent-register.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${img2Scale})`, transformOrigin: "center center" }} />
      </AbsoluteFill>
      {frame >= 320 && frame < 630 && (
        <div style={{ position: "absolute", top: 32, left: 32, opacity: label2Opacity * img2Fade, backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(12px)", padding: "10px 24px", borderRadius: 8, border: `1px solid ${COLORS.ens}40` }}>
          <span style={{ color: COLORS.ens, fontSize: 22, fontWeight: 600 }}>ENS Agent Registration</span>
        </div>
      )}

      <AbsoluteFill style={{ opacity: img3Opacity * img3Fade }}>
        <Img src={staticFile("images/agent-view.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${img3Scale})`, transformOrigin: "center center" }} />
      </AbsoluteFill>
      {frame >= 630 && frame < 880 && (
        <div style={{ position: "absolute", top: 32, left: 32, opacity: label3Opacity * img3Fade, backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(12px)", padding: "10px 24px", borderRadius: 8, border: `1px solid ${COLORS.erc8004}40` }}>
          <span style={{ color: COLORS.erc8004, fontSize: 22, fontWeight: 600 }}>ERC-8004 On-Chain Identity</span>
        </div>
      )}

      <AbsoluteFill style={{ opacity: img4Opacity * img4Fade }}>
        <Img src={staticFile("images/statistics.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${img4Scale})`, transformOrigin: "center center" }} />
      </AbsoluteFill>
      {frame >= 880 && frame < 1070 && (
        <div style={{ position: "absolute", top: 32, left: 32, opacity: label4Opacity * img4Fade, backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(12px)", padding: "10px 24px", borderRadius: 8, border: `1px solid ${COLORS.arc}40` }}>
          <span style={{ color: COLORS.arc, fontSize: 22, fontWeight: 600 }}>Agent Revenue Leaderboard</span>
        </div>
      )}

      {frame >= 1040 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: `rgba(10, 10, 10, ${textBgOpacity})` }}>
          <div style={{ textAlign: "center", opacity: textOpacity, transform: `scale(${textScale})` }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: COLORS.white, marginBottom: 16 }}>Free to write.</div>
            <div style={{ fontSize: 56, fontWeight: 700, color: COLORS.arc }}>Pay to read.</div>
            <div style={{ fontSize: 22, color: COLORS.muted, marginTop: 24 }}>Arc x402 Nanopayments</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
