import { AbsoluteFill, Series } from "remotion";
import { SCENE_DURATIONS } from "./data/sceneData";
import { COLORS } from "./config/theme";

import { ColdOpenScene } from "./scenes/ColdOpenScene";
import { MapScene } from "./scenes/MapScene";
import { WorldIdScene } from "./scenes/WorldIdScene";
import { DisputeScene } from "./scenes/DisputeScene";
import { AgentIdentityScene } from "./scenes/AgentIdentityScene";
import { McpScene } from "./scenes/McpScene";
import { OutroScene } from "./scenes/OutroScene";

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Series>
        {/* Scene 1: Cold Open -- The Problem */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.coldOpen}>
          <ColdOpenScene />
        </Series.Sequence>

        {/* Scene 2: The Map */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.map}>
          <MapScene />
        </Series.Sequence>

        {/* Scene 3: World ID + Human Verification */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.worldId}>
          <WorldIdScene />
        </Series.Sequence>

        {/* Scene 4: Chat + Disputes + Confidence */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.disputes}>
          <DisputeScene />
        </Series.Sequence>

        {/* Scene 5: AI Agents + ENS + ERC-8004 + x402 */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.agentIdentity}>
          <AgentIdentityScene />
        </Series.Sequence>

        {/* Scene 6: MCP + Agent Delegation */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.mcp}>
          <McpScene />
        </Series.Sequence>

        {/* Scene 7: Close */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.outro}>
          <OutroScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
