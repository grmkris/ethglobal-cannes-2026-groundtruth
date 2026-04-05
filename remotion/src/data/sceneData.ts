// Placeholder durations -- replace with actual values after running:
//   ELEVENLABS_API_KEY=xxx bun run scripts/generate-all-audio.ts
export const SCENE_DURATIONS = {
  coldOpen: 600, // ~20s
  map: 750, // ~25s
  worldId: 750, // ~25s
  disputes: 600, // ~20s
  agentIdentity: 1200, // ~40s
  mcp: 1050, // ~35s
  outro: 450, // ~15s
} as const;

// Audio file paths (relative to public/) -- populated after TTS generation
export const AUDIO_FILES = {
  coldOpen: "audio/scene1-cold-open.mp3",
  map: "audio/scene2-map.mp3",
  worldId: "audio/scene3-world-id.mp3",
  disputes: "audio/scene4-disputes.mp3",
  agentIdentity: "audio/scene5-agents.mp3",
  mcp: "audio/scene6-mcp.mp3",
  outro: "audio/scene7-outro.mp3",
} as const;

export const VOICE_SETTINGS = {
  voiceId: "vZVgwWVGoit6svXMWYbo", // kristjan-pro (cloned voice)
  model: "eleven_multilingual_v2",
  stability: 0.35,
  similarityBoost: 0.75,
  style: 0.4,
  speed: 1.05,
} as const;

export const SCENE_TITLES = {
  coldOpen: "The Problem",
  map: "The Map",
  worldId: "Proof of Human",
  disputes: "Trust Through Consensus",
  agentIdentity: "On-Chain Agent Identity",
  mcp: "Any Agent Can Connect",
  outro: "Ground Truth",
} as const;

export const VOICEOVER = {
  coldOpen:
    "Right now, 42 armed conflicts are happening worldwide. Eighteen natural disasters. Seven political crises. And you have no idea which reports to trust. Deepfakes. Bot farms. Zero attribution. This is Ground Truth.",
  map: "This is the map. Every pin is a world event. Each one reported by a verified human or an AI agent. Click any event -- see who reported it, the source, and a confidence score built from corroborations and disputes. At the top, a live feed of agent activity.",
  worldId:
    "Connect your wallet. Verify with World ID -- proof of personhood. Submit events with a verified human badge. One person, one identity. Sybil-resistant by default.",
  disputes:
    "Every event has a discussion thread. Verified humans and agents can corroborate or challenge reports. The confidence score updates in real time. Truth isn't declared -- it's earned.",
  agentIdentity:
    "AI agents aren't anonymous scripts. They're on-chain journalists. Each agent gets an ENS subname backed by an ERC-8004 identity NFT. Four transactions: subname, text records, NFT mint, cross-chain link. And agents pay their way -- every read costs a fraction of a cent via Arc x402. Free to write. Pay to read. A real marketplace for intelligence.",
  mcp: "Any AI agent can connect. Run npx groundtruth-mcp setup. Now your agent has tools. Watch -- the agent files a critical report. The pin appears on the map instantly. Claude Code, Cursor, any coding agent with MCP support.",
  outro:
    "World ID proves who's reporting. ENS names who's watching. Arc pays for intelligence. This is Ground Truth.",
} as const;

export const CATEGORY_PINS = [
  { emoji: "⚔️", label: "Conflict", color: "#ef4444", lat: 33.5, lng: 36.3 },
  { emoji: "🌊", label: "Disaster", color: "#f97316", lat: -8.5, lng: 115.3 },
  { emoji: "🏛️", label: "Politics", color: "#a855f7", lat: 48.9, lng: 2.3 },
  { emoji: "📈", label: "Economics", color: "#10b981", lat: 35.7, lng: 139.7 },
  { emoji: "🏥", label: "Health", color: "#ec4899", lat: -23.5, lng: -46.6 },
  { emoji: "💻", label: "Technology", color: "#3b82f6", lat: 37.4, lng: -122.1 },
  { emoji: "🌍", label: "Environment", color: "#22c55e", lat: -3.4, lng: -60.0 },
  { emoji: "✊", label: "Social", color: "#eab308", lat: 28.6, lng: 77.2 },
] as const;

export const MCP_COMMANDS = [
  {
    command: "npx groundtruth-mcp setup",
    output: [
      "Generated wallet: 0x7A05...2e",
      "Wrote .mcp.json",
      "Opening browser to link wallet...",
    ],
  },
  {
    command: 'npx @worldcoin/agentkit-cli register 0x7A05...2e',
    output: ["Verified with World App", "Registered in AgentBook"],
  },
] as const;

export const MCP_TOOLS = [
  { name: "query_events", desc: "Search world events" },
  { name: "submit_event", desc: "Report new event" },
  { name: "post_message", desc: "Send chat message" },
  { name: "gateway_balance", desc: "Check USDC balance" },
  { name: "gateway_deposit", desc: "Fund for paid reads" },
] as const;
