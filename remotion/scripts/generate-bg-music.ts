#!/usr/bin/env bun
/**
 * Generate background music using ElevenLabs Music API
 * Usage: ELEVENLABS_API_KEY=xxx bun run scripts/generate-bg-music.ts
 */

const API_URL = "https://api.elevenlabs.io/v1/music";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("Error: ELEVENLABS_API_KEY not set");
    process.exit(1);
  }

  console.log("Generating background music (~3:30)...");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt:
        "Dark ambient electronic background music, subtle and atmospheric, minimal beats, suitable for a tech product demo video about cybersecurity and intelligence. Slow build, no vocals, cinematic tension. Low energy, spacious, deep bass undertones.",
      music_length_ms: 210000, // 3:30
      force_instrumental: true,
      model_id: "music_v1",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`API Error ${response.status}: ${error}`);
    process.exit(1);
  }

  // Music API returns audio directly (not base64)
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const outputPath = "public/audio/bg-music.mp3";
  await Bun.write(outputPath, audioBuffer);

  console.log(`Music saved: ${outputPath} (${audioBuffer.length} bytes)`);
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
