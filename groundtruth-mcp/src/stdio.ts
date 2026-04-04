import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createAgentClient } from "./agent-client.js"
import { createMcpServer } from "./server.js"

// --- Env validation ---
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY
const GROUNDTRUTH_API_URL =
  process.env.GROUNDTRUTH_API_URL ?? "http://localhost:3000"

if (!AGENT_PRIVATE_KEY) {
  console.error("AGENT_PRIVATE_KEY is required")
  process.exit(1)
}

if (!AGENT_PRIVATE_KEY.startsWith("0x")) {
  console.error("AGENT_PRIVATE_KEY must start with 0x")
  process.exit(1)
}

// --- Boot ---
async function main() {
  const client = createAgentClient({
    privateKey: AGENT_PRIVATE_KEY as `0x${string}`,
    apiUrl: GROUNDTRUTH_API_URL,
  })

  // Fetch ERC-8004 identity (agent works without it, returns null on failure)
  const raw = await client.fetchIdentity()
  const identity =
    raw?.registrationStep === 4 && raw.agentId && raw.ensName
      ? { agentId: raw.agentId, ensName: raw.ensName }
      : null

  const server = createMcpServer({ client, identity })
  const transport = new StdioServerTransport()

  await server.connect(transport)
}

main()
