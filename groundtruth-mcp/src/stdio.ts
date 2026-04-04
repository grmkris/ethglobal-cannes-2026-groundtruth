import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createAgentClient } from "./agent-client"
import { createMcpServer } from "./server"

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

  const server = createMcpServer({ client })
  const transport = new StdioServerTransport()

  await server.connect(transport)
}

main()
