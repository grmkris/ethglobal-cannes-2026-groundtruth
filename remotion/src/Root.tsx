import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";
import { SCENE_DURATIONS } from "./data/sceneData";
import { VIDEO } from "./config/theme";

const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce(
  (a, b) => a + b,
  0
);

export const Root: React.FC = () => {
  return (
    <Composition
      id="GroundTruthDemo"
      component={DemoVideo}
      durationInFrames={TOTAL_FRAMES}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
    />
  );
};
