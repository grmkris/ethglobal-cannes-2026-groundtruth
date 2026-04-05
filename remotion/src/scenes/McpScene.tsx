import React from "react";
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
import { MCP_TOOLS } from "../data/sceneData";

export const McpScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Title (0-180)
  const titleScale = spring({ frame, fps, config: SPRING.default });
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleFade = interpolate(frame, [140, 190], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 1 background: smooth fade instead of ternary
  const bgOpacity = interpolate(frame, [160, 200], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 2: MCP screenshot (180-end)
  const imgOpacity = interpolate(frame, [170, 210], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const imgScale = interpolate(frame, [180, 744], [1, 1.05], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Label
  const labelOpacity = interpolate(frame, [230, 260], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Staggered tool reveals (400+)
  const clientsOpacity = interpolate(frame, [580, 620], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONTS.mono }}>
      {/* Phase 1 background */}
      <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: bgOpacity }} />

      {/* Phase 2: MCP screenshot */}
      <AbsoluteFill style={{ opacity: imgOpacity }}>
        <Img
          src={staticFile("images/agent-mcp.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${imgScale})`, transformOrigin: "center center" }}
        />
      </AbsoluteFill>

      {/* Phase 1: Title overlay */}
      {frame < 200 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", opacity: titleOpacity * titleFade, transform: `scale(${titleScale})` }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.mcp, textTransform: "uppercase", letterSpacing: 6, marginBottom: 16 }}>
              Layer 3
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, color: COLORS.white }}>
              Any Agent Can Connect
            </div>
            <div style={{ fontSize: 28, color: COLORS.emerald, marginTop: 16 }}>
              npx groundtruth-mcp setup
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Label badge */}
      {frame >= 220 && (
        <div style={{ position: "absolute", top: 32, left: 32, opacity: labelOpacity, backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(12px)", padding: "10px 24px", borderRadius: 8, border: `1px solid ${COLORS.mcp}40` }}>
          <span style={{ color: COLORS.mcp, fontSize: 22, fontWeight: 600 }}>Claude Code + MCP Tools</span>
        </div>
      )}

      {/* Staggered tools */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 16,
        }}
      >
        {MCP_TOOLS.map((tool, i) => {
          const o = interpolate(frame, [400 + i * 30, 430 + i * 30], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
          });
          return (
            <div
              key={tool.name}
              style={{
                opacity: o,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(12px)",
                padding: "8px 16px",
                borderRadius: 6,
                border: `1px solid ${COLORS.emerald}30`,
              }}
            >
              <span style={{ color: COLORS.emerald, fontSize: 18, fontWeight: 500 }}>
                {tool.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Compatible clients */}
      {frame >= 580 && (
        <div
          style={{
            position: "absolute",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: clientsOpacity,
            display: "flex",
            gap: 20,
          }}
        >
          {["OpenClaw", "Claude Code", "Cursor", "Any MCP Agent"].map((name, i) => (
            <React.Fragment key={name}>
              {i > 0 && <span style={{ color: COLORS.muted, fontSize: 20 }}>·</span>}
              <span style={{ color: COLORS.gray, fontSize: 20 }}>{name}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
