"use client"

import {
  createSIWEConfig,
  formatMessage,
  getAddressFromMessage,
  getChainIdFromMessage,
  type SIWECreateMessageArgs,
} from "@reown/appkit-siwe"
import { getAccount } from "wagmi/actions"
import { authClient } from "./auth-client"
import { wagmiConfig, chainIds } from "./wagmi-config"

export const siweConfig = createSIWEConfig({
  getMessageParams: async () => ({
    domain: window.location.host,
    uri: window.location.origin,
    chains: chainIds,
    statement: "Sign in to Ground Truth",
  }),

  getNonce: async (address?: string) => {
    const account = getAccount(wagmiConfig)
    const walletAddress = address ?? account.address
    if (!walletAddress) throw new Error("No wallet connected")

    const { data, error } = await authClient.siwe.nonce({
      walletAddress,
      chainId: account.chainId ?? 1,
    })
    if (error || !data?.nonce) throw new Error("Failed to get nonce")
    return data.nonce
  },

  createMessage: ({ address, ...args }: SIWECreateMessageArgs) =>
    formatMessage(args, address),

  verifyMessage: async ({ message, signature }) => {
    const address = getAddressFromMessage(message)
    const rawChainId = getChainIdFromMessage(message)
    const parsed = rawChainId.includes(":")
      ? rawChainId.split(":")[1]
      : rawChainId
    if (!parsed) throw new Error("Invalid chain ID in SIWE message")

    const { error } = await authClient.siwe.verify({
      message,
      signature,
      walletAddress: address,
      chainId: Number(parsed),
    })
    return !error
  },

  getSession: async () => {
    const { data } = await authClient.getSession()
    if (!data?.session) return null
    const account = getAccount(wagmiConfig)
    if (!account.address) return null
    return {
      address: account.address,
      chainId: account.chainId ?? 1,
    }
  },

  signOut: async () => {
    await authClient.signOut()
    return true
  },

  signOutOnDisconnect: true,
  signOutOnAccountChange: true,
  signOutOnNetworkChange: false,
})
