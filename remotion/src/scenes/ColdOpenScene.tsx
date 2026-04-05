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

  // Phase 1: Misinformation image (0-250)
  const imgOpacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const imgScale = interpolate(frame, [0, 250], [1, 1.08], {
    extrapolateRight: "clamp",
  });
  const imgDim = interpolate(frame, [200, 300], [0, 0.7], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Phase 2: "Who do you trust?" (250-450)
  const questionScale = spring({
    frame: Math.max(0, frame - 260),
    fps,
    config: SPRING.default,
  });
  const questionOpacity = interpolate(frame, [250, 280], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const questionFade = interpolate(frame, [400, 440], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Phase 3: Ground Truth title (450-end)
  const titleScale = spring({
    frame: Math.max(0, frame - 460),
    fps,
    config: SPRING.default,
  });
  const titleOpacity = interpolate(frame, [450, 480], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const underlineWidth = interpolate(frame, [500, 580], [0, 100], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [560, 600], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Phase 3b: Dual text at tail (610-704)
  const humanOpacity = interpolate(frame, [610, 640], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const agentOpacity = interpolate(frame, [640, 670], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}
    >
      {/* Phase 1: Misinformation image */}
      <AbsoluteFill style={{ opacity: imgOpacity }}>
        <Img
          src={staticFile("images/promp1.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imgScale})`,
          }}
        />
        <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${imgDim})` }} />
      </AbsoluteFill>

      {/* Phase 2: Who do you trust? */}
      {frame >= 250 && frame < 450 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: COLORS.white,
              opacity: questionOpacity * questionFade,
              transform: `scale(${questionScale})`,
            }}
          >
            Who do you trust?
          </div>
        </AbsoluteFill>
      )}

      {/* Phase 3: Ground Truth reveal */}
      {frame >= 450 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", opacity: titleOpacity, transform: `scale(${titleScale})` }}>
            <div style={{ fontSize: 88, fontWeight: 800, color: COLORS.white, letterSpacing: 6 }}>
              GROUND TRUTH
            </div>
            <div
              style={{
                height: 4,
                backgroundColor: COLORS.emerald,
                width: `${underlineWidth}%`,
                margin: "16px auto 0",
                borderRadius: 2,
              }}
            />
            <div style={{ fontSize: 26, color: COLORS.gray, marginTop: 24, opacity: subtitleOpacity, letterSpacing: 2 }}>
              Verified intelligence map
            </div>

            {/* Tail: dual text */}
            <div style={{ display: "flex", gap: 48, justifyContent: "center", marginTop: 48 }}>
              <div style={{ opacity: humanOpacity, color: COLORS.emerald, fontSize: 22 }}>
                Verified Humans
              </div>
              <div style={{ opacity: agentOpacity, color: COLORS.ens, fontSize: 22 }}>
                Accountable AI Agents
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
