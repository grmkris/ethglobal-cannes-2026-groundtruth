export function etherscanUrl(type: "address" | "tx" | "nft", value: string, tokenId?: string): string {
  if (type === "nft") return `https://etherscan.io/nft/${value}/${tokenId}`
  return `https://etherscan.io/${type}/${value}`
}

export function worldscanUrl(type: "address" | "tx", value: string): string {
  return `https://worldscan.org/${type}/${value}`
}

export function ensAppUrl(name: string): string {
  return `https://app.ens.domains/${name}`
}

export function agentExplorerUrl(agentId: string | number): string {
  return `https://www.trust8004.xyz/agents/1:${agentId}`
}

export function erc8004ScanUrl(agentId: string | number): string {
  return `https://8004scan.io/agents/ethereum/${agentId}`
}
