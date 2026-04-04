"use client"

import { useState, useCallback } from "react"
import { useWriteContract, useSwitchChain, useAccount, useConfig } from "wagmi"
import { getPublicClient } from "wagmi/actions"
import { namehash, encodeFunctionData, encodeAbiParameters, decodeEventLog, keccak256, toBytes } from "viem"
import { mainnet } from "wagmi/chains"
import { useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import {
  ENS_REGISTRY,
  ENS_PUBLIC_RESOLVER,
  ERC8004_IDENTITY_REGISTRY,
  ensRegistryAbi,
  publicResolverAbi,
  identityRegistryAbi,
  buildDefaultEnsip25Key,
} from "@/lib/contracts"
import type { AgentProfileId, AgentWalletId } from "@/lib/typeid"
import { toast } from "sonner"

export type RegistrationStep = 0 | 1 | 2 | 3 | 4

interface RegistrationState {
  profileId: AgentProfileId | null
  currentStep: RegistrationStep
  isPending: boolean
  error: string | null
  isComplete: boolean
}

export function useAgentRegistration() {
  const { address } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const config = useConfig()
  const queryClient = useQueryClient()

  const [state, setState] = useState<RegistrationState>({
    profileId: null,
    currentStep: 0,
    isPending: false,
    error: null,
    isComplete: false,
  })

  const register = useCallback(
    async (params: {
      agentWalletId: AgentWalletId
      agentWalletAddress: string
      label: string
      parentEnsName: string
      mandate: string
      sources: string
    }) => {
      setState((s) => ({ ...s, isPending: true, error: null }))

      try {
        // --- Step 0: Create profile in DB ---
        const profile = await client.agent.create({
          agentWalletId: params.agentWalletId,
          label: params.label,
          parentEnsName: params.parentEnsName,
          mandate: params.mandate,
          sources: params.sources,
        })
        const profileId = profile.id as AgentProfileId
        setState((s) => ({ ...s, profileId }))

        const fullName = `${params.label}.${params.parentEnsName}`
        const parentNode = namehash(params.parentEnsName)
        const subnameNode = namehash(fullName)
        const labelHash = keccak256(toBytes(params.label))

        // Ensure we're on mainnet
        await switchChainAsync({ chainId: mainnet.id })
        const mainnetClient = getPublicClient(config, { chainId: mainnet.id })
        if (!mainnetClient) {
          throw new Error("Mainnet client not found")
        }

        // --- TX1: Create ENS subname via Registry ---
        toast.info("Step 1/4: Creating ENS subname...")

        const tx1 = await writeContractAsync({
          chainId: mainnet.id,
          address: ENS_REGISTRY,
          abi: ensRegistryAbi,
          functionName: "setSubnodeRecord",
          args: [
            parentNode,
            labelHash,
            address as `0x${string}`,
            ENS_PUBLIC_RESOLVER,
            BigInt(0),
          ],
        })

        toast.info("Waiting for confirmation...")
        await mainnetClient.waitForTransactionReceipt({ hash: tx1 })

        await client.agent.recordStep({ profileId, step: 1 })
        setState((s) => ({ ...s, currentStep: 1 }))
        toast.success("Subname created!")

        // --- TX2: Set text records ---
        toast.info("Step 2/4: Setting agent text records...")

        const setTextCalls = [
          encodeFunctionData({
            abi: publicResolverAbi,
            functionName: "setText",
            args: [subnameNode, "mandate", params.mandate],
          }),
          encodeFunctionData({
            abi: publicResolverAbi,
            functionName: "setText",
            args: [subnameNode, "sources", params.sources],
          }),
          encodeFunctionData({
            abi: publicResolverAbi,
            functionName: "setText",
            args: [subnameNode, "platform", "groundtruth"],
          }),
          encodeFunctionData({
            abi: publicResolverAbi,
            functionName: "setText",
            args: [subnameNode, "agent-wallet", params.agentWalletAddress],
          }),
          encodeFunctionData({
            abi: publicResolverAbi,
            functionName: "setAddr",
            args: [subnameNode, params.agentWalletAddress as `0x${string}`],
          }),
        ]

        const tx2 = await writeContractAsync({
          chainId: mainnet.id,
          address: ENS_PUBLIC_RESOLVER,
          abi: publicResolverAbi,
          functionName: "multicall",
          args: [setTextCalls],
        })

        toast.info("Waiting for confirmation...")
        await mainnetClient.waitForTransactionReceipt({ hash: tx2 })

        await client.agent.recordStep({ profileId, step: 2 })
        setState((s) => ({ ...s, currentStep: 2 }))
        toast.success("Text records set!")

        // --- TX3: Mint ERC-8004 identity on mainnet ---
        toast.info("Step 3/4: Minting ERC-8004 identity...")

        const agentCardUrl = `${window.location.origin}/api/agents/${profileId}`

        const encodeString = (v: string) =>
          encodeAbiParameters([{ type: "string" }], [v])

        const tx3 = await writeContractAsync({
          chainId: mainnet.id,
          address: ERC8004_IDENTITY_REGISTRY,
          abi: identityRegistryAbi,
          functionName: "register",
          args: [
            agentCardUrl,
            [
              { key: "platform", value: encodeString("groundtruth") },
              { key: "ensName", value: encodeString(fullName) },
              { key: "mandate", value: encodeString(params.mandate) },
            ],
          ],
        })

        let erc8004AgentId: string | undefined
        toast.info("Waiting for confirmation...")
        const receipt = await mainnetClient.waitForTransactionReceipt({ hash: tx3 })
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: identityRegistryAbi,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName === "Registered") {
              erc8004AgentId = String((decoded.args as any).agentId)
              break
            }
          } catch {
            // not our event, skip
          }
        }

        await client.agent.recordStep({
          profileId,
          step: 3,
          erc8004AgentId: erc8004AgentId ?? "unknown",
        })
        setState((s) => ({ ...s, currentStep: 3 }))
        toast.success("ERC-8004 identity minted!")

        // --- TX4: Set ENSIP-25 verification ---
        toast.info("Step 4/4: Linking ENSIP-25 verification...")

        const ensip25Key = buildDefaultEnsip25Key(erc8004AgentId ?? "0")

        const tx4 = await writeContractAsync({
          chainId: mainnet.id,
          address: ENS_PUBLIC_RESOLVER,
          abi: publicResolverAbi,
          functionName: "setText",
          args: [subnameNode, ensip25Key, "1"],
        })

        toast.info("Waiting for confirmation...")
        await mainnetClient.waitForTransactionReceipt({ hash: tx4 })

        await client.agent.recordStep({ profileId, step: 4 })
        setState((s) => ({
          ...s,
          currentStep: 4,
          isPending: false,
          isComplete: true,
        }))

        queryClient.invalidateQueries({ queryKey: ["agent", "profiles"] })
        toast.success("Agent identity registered!")

        return { profileId, ensName: fullName }
      } catch (err: any) {
        const message = err?.shortMessage || err?.message || "Transaction failed"
        setState((s) => ({ ...s, isPending: false, error: message }))
        toast.error("Registration failed", { description: message })
        throw err
      }
    },
    [address, switchChainAsync, writeContractAsync, config, queryClient]
  )

  const reset = useCallback(() => {
    setState({
      profileId: null,
      currentStep: 0,
      isPending: false,
      error: null,
      isComplete: false,
    })
  }, [])

  return {
    ...state,
    register,
    reset,
  }
}
