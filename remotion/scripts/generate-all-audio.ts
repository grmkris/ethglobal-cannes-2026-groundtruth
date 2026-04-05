#!/usr/bin/env bun
/**
 * Generate all scene audio with character-level timestamps using ElevenLabs API
 * Usage: ELEVENLABS_API_KEY=xxx bun run scripts/generate-all-audio.ts
 *
 * Reads script .txt files from scripts/, generates for each:
 * - public/audio/<name>.mp3
 * - public/audio/<name>-timestamps.json
 *
 * Then prints SCENE_DURATIONS to paste into sceneData.ts
 */

import { readFileSync, mkdirSync } from "fs";
import { join } from "path";

const VOICE_ID = "vZVgwWVGoit6svXMWYbo"; // kristjan-pro (cloned voice)
const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`;
const FPS = 30;

interface TimestampResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

const SCENES = [
  { key: "coldOpen", name: "scene1-cold-open", file: "scene1-cold-open.txt" },
  { key: "map", name: "scene2-map", file: "scene2-map.txt" },
  { key: "worldId", name: "scene3-world-id", file: "scene3-world-id.txt" },
  { key: "disputes", name: "scene4-disputes", file: "scene4-disputes.txt" },
  { key: "agentIdentity", name: "scene5-agents", file: "scene5-agents.txt" },
  { key: "mcp", name: "scene6-mcp", file: "scene6-mcp.txt" },
  { key: "outro", name: "scene7-outro", file: "scene7-outro.txt" },
] as const;

async function generateWithTimestamps(text: string, outputName: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  console.log(`Generating: ${outputName}...`);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.75,
        style: 0.20,
        speed: 1.0,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data: TimestampResponse = await response.json();

  // Save audio
  const audioBuffer = Buffer.from(data.audio_base64, "base64");
  const audioPath = join("public/audio", `${outputName}.mp3`);
  await Bun.write(audioPath, audioBuffer);
  console.log(`  Audio saved: ${audioPath}`);

  // Save timestamps
  const timestampsPath = join("public/audio", `${outputName}-timestamps.json`);
  await Bun.write(timestampsPath, JSON.stringify(data.alignment, null, 2));
  console.log(`  Timestamps saved: ${timestampsPath}`);

  // Calculate duration
  const duration = Math.max(...data.alignment.character_end_times_seconds);
  const frames = Math.ceil(duration * FPS);
  console.log(`  Duration: ${duration.toFixed(2)}s (${frames} frames)\n`);

  return { duration, frames };
}

async function main() {
  mkdirSync("public/audio", { recursive: true });

  const results: { key: string; name: string; duration: number; frames: number }[] = [];

  for (const scene of SCENES) {
    const text = readFileSync(join("scripts", scene.file), "utf-8").trim();
    const { duration, frames } = await generateWithTimestamps(text, scene.name);
    results.push({ key: scene.key, name: scene.name, duration, frames });
  }

  // Print summary
  console.log("=== Summary ===\n");
  let totalFrames = 0;
  for (const r of results) {
    console.log(`${r.name}: ${r.duration.toFixed(2)}s (${r.frames} frames)`);
    totalFrames += r.frames;
  }
  const totalSeconds = totalFrames / FPS;
  console.log(
    `\nTotal: ${(totalSeconds / 60).toFixed(2)} minutes (${totalFrames} frames)`
  );

  // Print SCENE_DURATIONS for sceneData.ts
  console.log("\n=== Paste into sceneData.ts ===\n");
  console.log("export const SCENE_DURATIONS = {");
  for (const r of results) {
    console.log(
      `  ${r.key}: ${r.frames}, // ${r.duration.toFixed(2)}s`
    );
  }
  console.log("} as const;");

  // Print AUDIO_FILES for sceneData.ts
  console.log("\nexport const AUDIO_FILES = {");
  for (const r of results) {
    console.log(`  ${r.key}: "audio/${r.name}.mp3",`);
  }
  console.log("} as const;");
}

main().catch(console.error);
