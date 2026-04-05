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

export const WorldIdScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Title (0-150)
  const titleScale = spring({ frame, fps, config: SPRING.default });
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleFade = interpolate(frame, [120, 160], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 2: World ID orb image (150-end)
  const orbOpacity = interpolate(frame, [140, 180], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const orbScale = interpolate(frame, [150, 609], [1, 1.04], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const pulse = 1 + Math.sin(frame * 0.04) * 0.008;

  // Staggered text phrases in dead zone (340-609)
  const phrases = [
    { text: "Submit Events", frame: 340, color: COLORS.white },
    { text: "Verified Human Badge", frame: 400, color: COLORS.emerald },
    { text: "No bots. No spam.", frame: 480, color: COLORS.white },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}>
      {/* Phase 2: World ID orb */}
      <AbsoluteFill style={{ opacity: orbOpacity }}>
        <Img
          src={staticFile("images/prompt2.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${orbScale * pulse})`,
          }}
        />
        <AbsoluteFill style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }} />
      </AbsoluteFill>

      {/* Phase 1: Title overlay */}
      {frame < 200 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", opacity: titleOpacity * titleFade, transform: `scale(${titleScale})` }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.worldId, textTransform: "uppercase", letterSpacing: 6, marginBottom: 16 }}>
              Layer 1
            </div>
            <div style={{ fontSize: 72, fontWeight: 700, color: COLORS.white }}>
              Proof of Human
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Staggered text phrases */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 32,
        }}
      >
        {phrases.map((p) => {
          const o = interpolate(frame, [p.frame, p.frame + 30], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
          });
          return (
            <div
              key={p.text}
              style={{
                opacity: o,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                backdropFilter: "blur(12px)",
                padding: "10px 24px",
                borderRadius: 8,
                border: `1px solid ${COLORS.worldId}40`,
              }}
            >
              <span style={{ color: p.color, fontSize: 22, fontWeight: 600 }}>
                {p.text}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
