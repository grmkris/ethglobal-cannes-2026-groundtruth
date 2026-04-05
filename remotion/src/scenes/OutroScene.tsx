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

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background globe
  const globeOpacity = interpolate(frame, [0, 40], [0, 0.25], { extrapolateRight: "clamp" });
  const globeScale = interpolate(frame, [0, 831], [1, 1.08], { extrapolateRight: "clamp" });

  // Phase 1: Deployment info (0-350)
  const deployOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const deployFade = interpolate(frame, [320, 370], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Chain badges staggered
  const chain1 = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const chain2 = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const chain3 = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const urlOpacity = interpolate(frame, [170, 200], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 2: Taglines (380-660)
  const line1 = interpolate(frame, [380, 410], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const line2 = interpolate(frame, [430, 460], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const line3 = interpolate(frame, [480, 510], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  // Fade out taglines smoothly before Phase 3
  const taglineFade = interpolate(frame, [630, 670], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 3: Final title (670-end)
  const finalScale = spring({ frame: Math.max(0, frame - 680), fps, config: SPRING.default });
  const finalOpacity = interpolate(frame, [670, 700], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const chains = [
    { label: "Ethereum Mainnet", desc: "ENS + ERC-8004", color: COLORS.erc8004, opacity: chain1 },
    { label: "World Chain", desc: "Human verification", color: COLORS.worldId, opacity: chain2 },
    { label: "Arc Testnet", desc: "x402 Nanopayments", color: COLORS.arc, opacity: chain3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}>
      {/* Globe background */}
      <AbsoluteFill style={{ opacity: globeOpacity }}>
        <Img src={staticFile("images/promp5.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${globeScale})` }} />
      </AbsoluteFill>

      {/* Phase 1: Deployment info */}
      {frame < 380 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: deployOpacity * deployFade }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, fontWeight: 700, color: COLORS.white, marginBottom: 40 }}>
              Deployed & Live
            </div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 40 }}>
              {chains.map((chain) => (
                <div
                  key={chain.label}
                  style={{
                    opacity: chain.opacity,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${chain.color}50`,
                    borderRadius: 12,
                    padding: "20px 28px",
                    textAlign: "center",
                    minWidth: 220,
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 600, color: chain.color, marginBottom: 6 }}>
                    {chain.label}
                  </div>
                  <div style={{ fontSize: 18, color: COLORS.gray }}>{chain.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ opacity: urlOpacity, fontSize: 32, fontWeight: 700, color: COLORS.emerald }}>
              groundtruth.grm.wtf
            </div>
            <div style={{ opacity: urlOpacity, fontSize: 20, color: COLORS.gray, marginTop: 8 }}>
              Connect your wallet and try it yourself
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Phase 2: Taglines */}
      {frame >= 380 && frame < 680 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: taglineFade }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 38, color: COLORS.worldId, opacity: line1, marginBottom: 20 }}>
              World ID proves who's reporting.
            </div>
            <div style={{ fontSize: 38, color: COLORS.ens, opacity: line2, marginBottom: 20 }}>
              ENS names who's watching.
            </div>
            <div style={{ fontSize: 38, color: COLORS.arc, opacity: line3 }}>
              Arc pays for intelligence.
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Phase 3: Final */}
      {frame >= 670 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", opacity: finalOpacity, transform: `scale(${finalScale})` }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: COLORS.white, letterSpacing: 4 }}>
              GROUND TRUTH
            </div>
            <div style={{ height: 4, backgroundColor: COLORS.emerald, width: "60%", margin: "16px auto 0", borderRadius: 2 }} />
            <div style={{ fontSize: 22, color: COLORS.muted, marginTop: 20 }}>
              ETHGlobal Cannes 2026
            </div>
            <div style={{ fontSize: 22, color: COLORS.emerald, marginTop: 8 }}>
              groundtruth.grm.wtf
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
