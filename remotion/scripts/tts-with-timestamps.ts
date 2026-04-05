#!/usr/bin/env bun
/**
 * Generate TTS audio with character-level timestamps using ElevenLabs API
 * Usage: bun run scripts/tts-with-timestamps.ts <output-name> [phrases-to-find...]
 *
 * Reads script from stdin, outputs:
 * - public/audio/<output-name>.mp3
 * - public/audio/<output-name>-timestamps.json
 * - Console: phrase timings in frames @ 30fps
 *
 * Example:
 *   cat scripts/scene1-cold-open.txt | bun run scripts/tts-with-timestamps.ts scene1-cold-open "Ground Truth" "Deepfakes"
 */

const VOICE_ID = "vZVgwWVGoit6svXMWYbo"; // kristjan-pro (cloned voice)
const MODEL_ID = "eleven_multilingual_v2";
const FPS = 30;

interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface TTSResponse {
  audio_base64: string;
  alignment: Alignment;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(
      "Usage: bun run tts-with-timestamps.ts <output-name> [phrases...]"
    );
    console.error("Pipe script text via stdin");
    process.exit(1);
  }

  const outputName = args[0]!;
  const phrases = args.slice(1);

  // Read script from stdin
  const script = await Bun.stdin.text();
  if (!script.trim()) {
    console.error("Error: No text provided via stdin");
    process.exit(1);
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("Error: ELEVENLABS_API_KEY not set");
    process.exit(1);
  }

  console.log(`Generating audio for: ${outputName}`);
  console.log(`Script length: ${script.length} chars`);
  console.log(
    `Phrases to find: ${phrases.length > 0 ? phrases.join(", ") : "(none)"}\n`
  );

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.4,
          speed: 1.05,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`API Error ${response.status}: ${error}`);
    process.exit(1);
  }

  const data: TTSResponse = await response.json();

  // Save audio
  const audioPath = `public/audio/${outputName}.mp3`;
  const audioBuffer = Buffer.from(data.audio_base64, "base64");
  await Bun.write(audioPath, audioBuffer);
  console.log(`Audio saved: ${audioPath}`);

  // Save timestamps
  const timestampsPath = `public/audio/${outputName}-timestamps.json`;
  await Bun.write(timestampsPath, JSON.stringify(data.alignment, null, 2));
  console.log(`Timestamps saved: ${timestampsPath}`);

  // Analyze timings
  const {
    characters,
    character_start_times_seconds,
    character_end_times_seconds,
  } = data.alignment;
  const text = characters.join("");
  const lastTime =
    character_end_times_seconds[character_end_times_seconds.length - 1]!;
  const totalFrames = Math.ceil(lastTime * FPS);

  console.log(`\n=== Audio Info ===`);
  console.log(`Duration: ${lastTime.toFixed(2)}s`);
  console.log(`Frames @ ${FPS}fps: ${totalFrames}`);

  // Find phrase timings
  if (phrases.length > 0) {
    console.log(`\n=== Phrase Timings (frames @ ${FPS}fps) ===\n`);
    for (const phrase of phrases) {
      const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx >= 0) {
        const startTime = character_start_times_seconds[idx]!;
        const frame = Math.round(startTime * FPS);
        console.log(`"${phrase}": ${startTime.toFixed(2)}s -> frame ${frame}`);
      } else {
        console.log(`"${phrase}": NOT FOUND`);
      }
    }
  }

  console.log(`\nDone! Set SCENE_DURATIONS for this scene = ${totalFrames}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
