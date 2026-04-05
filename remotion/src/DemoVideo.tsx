import { AbsoluteFill, Series, Audio, staticFile } from "remotion";
import { SCENE_DURATIONS, AUDIO_FILES } from "./data/sceneData";
import { COLORS } from "./config/theme";
import { SceneTransition } from "./components/SceneTransition";

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
      <Audio src={staticFile("audio/bg-music.mp3")} volume={0.10} />
      <Series>
        <Series.Sequence durationInFrames={SCENE_DURATIONS.coldOpen}>
          <Audio src={staticFile(AUDIO_FILES.coldOpen)} />
          <SceneTransition durationInFrames={SCENE_DURATIONS.coldOpen}>
            <ColdOpenScene />
          </SceneTransition>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.map}>
          <Audio src={staticFile(AUDIO_FILES.map)} />
          <SceneTransition durationInFrames={SCENE_DURATIONS.map}>
            <MapScene />
          </SceneTransition>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.worldId}>
          <Audio src={staticFile(AUDIO_FILES.worldId)} />
          <SceneTransition durationInFrames={SCENE_DURATIONS.worldId}>
            <WorldIdScene />
          </SceneTransition>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.disputes}>
          <Audio src={staticFile(AUDIO_FILES.disputes)} />
          <SceneTransition durationInFrames={SCENE_DURATIONS.disputes}>
            <DisputeScene />
          </SceneTransition>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.agentIdentity}>
          <Audio src={staticFile(AUDIO_FILES.agentIdentity)} />
          <SceneTransition durationInFrames={SCENE_DURATIONS.agentIdentity}>
            <AgentIdentityScene />
          </SceneTransition>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.mcp}>
          <Audio src={staticFile(AUDIO_FILES.mcp)} />
          <SceneTransition durationInFrames={SCENE_DURATIONS.mcp}>
            <McpScene />
          </SceneTransition>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.outro}>
          <Audio src={staticFile(AUDIO_FILES.outro)} />
          <SceneTransition durationInFrames={SCENE_DURATIONS.outro}>
            <OutroScene />
          </SceneTransition>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
