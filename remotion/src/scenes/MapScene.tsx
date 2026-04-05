import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { COLORS, FONTS } from "../config/theme";
import { CATEGORY_PINS } from "../data/sceneData";

export const MapScene: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Ken Burns: slow zoom shifting focus
  const scale = interpolate(frame, [0, 751], [1, 1.08], {
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(frame, [0, 751], [0, -20], {
    extrapolateRight: "clamp",
  });

  // URL bar
  const urlOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Category legend (250-500)
  const legendOpacity = interpolate(frame, [250, 290], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Live indicator (500+)
  const statsOpacity = interpolate(frame, [500, 540], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}>
      <AbsoluteFill style={{ opacity }}>
        <Img
          src={staticFile("images/landing.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateX(${translateX}px)`,
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* URL indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: urlOpacity,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(12px)",
          padding: "10px 28px",
          borderRadius: 8,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <span style={{ color: COLORS.emerald, fontSize: 24, fontWeight: 600 }}>
          groundtruth.grm.wtf
        </span>
      </div>

      {/* Category legend */}
      {frame >= 250 && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 32,
            opacity: legendOpacity,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            padding: "16px 20px",
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {CATEGORY_PINS.map((pin, i) => {
            const pinOpacity = interpolate(
              frame,
              [270 + i * 15, 290 + i * 15],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );
            return (
              <div key={pin.label} style={{ display: "flex", alignItems: "center", gap: 10, opacity: pinOpacity }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pin.color }} />
                <span style={{ color: COLORS.gray, fontSize: 18 }}>{pin.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Live indicator */}
      {frame >= 500 && (
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            opacity: statsOpacity,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            padding: "12px 24px",
            borderRadius: 8,
            border: `1px solid ${COLORS.emerald}30`,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.emerald, boxShadow: `0 0 8px ${COLORS.emerald}` }} />
          <span style={{ color: COLORS.emerald, fontSize: 20, fontWeight: 600 }}>Live</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
