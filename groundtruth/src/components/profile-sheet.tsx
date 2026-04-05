"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { WorldIdVerifyButton } from "@/components/world-id-verify-button"
import { useSession, signOut } from "@/lib/auth-client"
import { useAccount, useWriteContract, useConfig } from "wagmi"
import { getPublicClient } from "wagmi/actions"
import { mainnet } from "wagmi/chains"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  ArrowUpRightIcon,
  BadgeCheckIcon,
  BotIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleDotIcon,
  CopyIcon,
  LinkIcon,
  Loader2Icon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import { useAgentWallets } from "@/hooks/use-agent-wallets"
import { useAgentProfiles } from "@/hooks/use-agent-profiles"
import { useAgentRegistration, type RegistrationStep } from "@/hooks/use-agent-registration"
import { useAgentBookStatus } from "@/hooks/use-agentbook-status"
import { useAgentReputation } from "@/hooks/use-agent-reputation"
import { useOnchainWallet } from "@/hooks/use-onchain-wallet"
import { ERC8004_IDENTITY_REGISTRY, identityRegistryAbi } from "@/lib/contracts"
import { etherscanUrl, worldscanUrl, ensAppUrl, agentExplorerUrl } from "@/lib/explorers"
import type { AgentProfileId, AgentWalletId } from "@/lib/typeid";


function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isMobile
}

export function ProfileSheet({
  open,
  onOpenChange,
  defaultAgentAddress,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAgentAddress?: string
}) {
  const { data: sessionData } = useSession()
  const { address } = useAccount()
  const { resolvedTheme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const user = sessionData?.user

  if (!user) return null

  const displayName = user.name || (address ? truncateAddress(address) : "User")
  const initials = displayName.slice(0, 2).toUpperCase()

  function handleCopyAddress() {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success("Address copied")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[85svh] rounded-t-2xl" : undefined}
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {user.image && <AvatarImage src={user.image} alt={displayName} />}
              <AvatarFallback>{initials}</AvatarFallback>
              {user.worldIdVerified && (
                <AvatarBadge className="bg-emerald-500" />
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{displayName}</SheetTitle>
              {address && (
                <SheetDescription className="flex items-center gap-1">
                  <span className="truncate font-mono text-xs">
                    {truncateAddress(address)}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <CopyIcon size={10} />
                  </button>
                </SheetDescription>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6">
          {/* World ID */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Identity
            </h3>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <BadgeCheckIcon
                  size={14}
                  className={user.worldIdVerified ? "text-emerald-500" : "text-muted-foreground"}
                />
                <span className="text-sm">World ID</span>
              </div>
              <WorldIdVerifyButton />
            </div>
          </div>

          <Separator />

          {/* Agents */}
          <AgentsSection defaultAgentAddress={defaultAgentAddress} />

          <Separator />

          {/* Appearance */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Appearance
            </h3>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {resolvedTheme === "dark" ? (
                  <MoonIcon size={14} className="text-muted-foreground" />
                ) : (
                  <SunIcon size={14} className="text-muted-foreground" />
                )}
                <span className="text-sm">Theme</span>
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {resolvedTheme}
              </span>
            </button>
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => {
              signOut()
              onOpenChange(false)
            }}
          >
            <LogOutIcon size={14} />
            Sign out
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function AgentsSection({ defaultAgentAddress }: { defaultAgentAddress?: string }) {
  const { agents, link } = useAgentWallets()
  const profiles = useAgentProfiles()
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const config = useConfig()
  const [address, setAddress] = useState(defaultAgentAddress ?? "")
  const [registerWalletId, setRegisterWalletId] = useState<string | null>(null)
  const [linkingProfileId, setLinkingProfileId] = useState<string | null>(null)

  const deleteProfile = useMutation({
    mutationFn: (profileId: AgentProfileId) => client.agent.delete({ profileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", "profiles"] })
      toast.success("Profile deleted")
    },
  })

  const unlinkWallet = useMutation({
    mutationFn: (walletId: AgentWalletId) => client.agent.unlinkWallet({ walletId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent"] })
      queryClient.invalidateQueries({ queryKey: ["worldId", "agents"] })
      toast.success("Wallet removed")
    },
  })

  async function handleLinkWallet(profileId: AgentProfileId) {
    try {
      setLinkingProfileId(profileId)
      const sig = await client.agent.getWalletSignature({ profileId })
      if (!sig) {
        toast.error("No wallet signature found", { description: "Run your MCP server first to generate the signature." })
        return
      }
      if (Number(sig.deadline) < Math.floor(Date.now() / 1000)) {
        toast.error("Signature expired", { description: "Restart your MCP server to generate a fresh signature." })
        return
      }
      const tx = await writeContractAsync({
        chainId: mainnet.id,
        address: ERC8004_IDENTITY_REGISTRY,
        abi: identityRegistryAbi,
        functionName: "setAgentWallet",
        args: [
          BigInt(sig.erc8004AgentId),
          sig.agentWalletAddress as `0x${string}`,
          BigInt(sig.deadline),
          sig.signature as `0x${string}`,
        ],
      })
      toast.info("Waiting for confirmation...")
      const mainnetClient = getPublicClient(config, { chainId: mainnet.id })
      if (mainnetClient) {
        await mainnetClient.waitForTransactionReceipt({ hash: tx })
      }
      toast.success("Agent wallet linked on-chain!")
    } catch (err: any) {
      toast.error("Failed to link wallet", { description: err?.shortMessage || err?.message })
    } finally {
      setLinkingProfileId(null)
    }
  }

  const agentList = agents.data ?? []
  const profileList = profiles.data ?? []
  const hasWallets = agentList.length > 0

  function handleLink() {
    const trimmed = address.trim()
    if (!trimmed) return
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      toast.error("Invalid address", { description: "Must be a 0x-prefixed Ethereum address (42 characters)" })
      return
    }
    link.mutate(
      { agentAddress: trimmed },
      { onSuccess: () => setAddress("") }
    )
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Agents
      </h3>

      <div className="space-y-3 text-xs">
        {/* Onboarding — only when no wallets linked */}
        {!hasWallets && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div>
              <p className="text-xs font-medium mb-1">Connect your AI agent</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Generates a wallet, installs the MCP server, and configures your AI coding assistant automatically.
              </p>
            </div>

            <CopyBlock code="npx groundtruth-mcp setup" />

            <p className="text-[11px] text-muted-foreground">
              Then paste the wallet address below to link it to your account.
            </p>
          </div>
        )}

        {/* Add agent — setup + link in one section */}
        {hasWallets && (
          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground">Add agent</p>
            <CopyBlock code="npx groundtruth-mcp setup" />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLink()}
                placeholder="0x agent wallet address"
                className="h-8 flex-1 rounded-md border bg-transparent px-2.5 font-mono text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={handleLink}
                disabled={link.isPending || !address.trim()}
              >
                <LinkIcon size={12} />
                Link
              </Button>
            </div>
          </div>
        )}

        {/* Link wallet input — only when no wallets yet (onboarding shows setup above) */}
        {!hasWallets && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
              placeholder="0x agent wallet address"
              className="h-8 flex-1 rounded-md border bg-transparent px-2.5 font-mono text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={handleLink}
              disabled={link.isPending || !address.trim()}
            >
              <LinkIcon size={12} />
              Link
            </Button>
          </div>
        )}

        {/* Agent wallet cards */}
        {agentList.map((wallet) => {
          const profile = profileList.find((p) => p.agentWalletId === wallet.id)
          return (
            <AgentWalletCard
              key={wallet.id}
              wallet={wallet}
              profile={profile}
              onUnlink={() => unlinkWallet.mutate(wallet.id)}
              onDeleteProfile={(id) => deleteProfile.mutate(id)}
              onRegister={() => setRegisterWalletId(wallet.id)}
              onLinkWallet={handleLinkWallet}
              isLinking={linkingProfileId === profile?.id}
              isUnlinking={unlinkWallet.isPending}
            />
          )
        })}
      </div>

      <RegisterAgentDialog
        open={registerWalletId !== null}
        onOpenChange={(open) => { if (!open) setRegisterWalletId(null) }}
        agentWallets={agentList}
        preselectedWalletId={registerWalletId}
      />
    </div>
  )
}

const STEP_LABELS = [
  "Ready",
  "Subname",
  "Records",
  "ERC-8004",
  "ENSIP-25",
] as const

function StepIndicator({ currentStep, isPending }: { currentStep: RegistrationStep; isPending: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((step) => {
        const done = currentStep >= step
        const active = currentStep === step - 1 && isPending
        return (
          <div key={step} className="flex items-center gap-1">
            {step > 1 && (
              <div className={`h-px w-4 ${done ? "bg-emerald-500" : "bg-border"}`} />
            )}
            <div className="flex flex-col items-center">
              {done ? (
                <CheckCircle2Icon size={16} className="text-emerald-500" />
              ) : active ? (
                <Loader2Icon size={16} className="animate-spin text-violet-500" />
              ) : (
                <CircleDotIcon size={16} className="text-muted-foreground/40" />
              )}
              <span className="mt-0.5 text-[9px] text-muted-foreground">
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RegisterAgentDialog({
  open,
  onOpenChange,
  agentWallets,
  preselectedWalletId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentWallets: Array<{ id: string; address: string; createdAt: Date }>
  preselectedWalletId?: string | null
}) {
  const { data: sessionData } = useSession()
  const registration = useAgentRegistration()

  const [selectedWalletId, setSelectedWalletId] = useState(preselectedWalletId ?? "")
  const [label, setLabel] = useState("")
  const [mandate, setMandate] = useState("")
  const [sources, setSources] = useState("")

  useEffect(() => {
    if (preselectedWalletId) setSelectedWalletId(preselectedWalletId)
  }, [preselectedWalletId])

  const user = sessionData?.user
  const userEnsName = user?.name?.endsWith(".eth") ? user.name : null
  const selectedWallet = agentWallets.find((w) => w.id === selectedWalletId)
  const previewName = label && userEnsName ? `${label}.${userEnsName}` : ""

  const canSubmit =
    selectedWalletId &&
    label &&
    mandate &&
    userEnsName &&
    !registration.isPending

  function handleRegister() {
    if (!canSubmit || !selectedWallet || !userEnsName) return
    registration.register({
      agentWalletId: selectedWalletId as any,
      agentWalletAddress: selectedWallet.address,
      label,
      parentEnsName: userEnsName,
      mandate,
      sources,
    })
  }

  function handleClose(open: boolean) {
    if (!open && !registration.isPending) {
      registration.reset()
      setSelectedWalletId("")
      setLabel("")
      setMandate("")
      setSources("")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Register Agent ENS Identity</DialogTitle>
          <DialogDescription className="text-xs">
            Create an ENS subname and mint an ERC-8004 identity NFT.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(registration.isPending || registration.isComplete) && (
            <div className="flex justify-center py-2">
              <StepIndicator
                currentStep={registration.currentStep}
                isPending={registration.isPending}
              />
            </div>
          )}

          {registration.isComplete ? (
            <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Agent identity registered!
              </p>
              <p className="text-center font-mono text-xs">{previewName}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              {!userEnsName && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  Your wallet needs an ENS name to register agent subnames.
                </p>
              )}

              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Agent Wallet
                </label>
                {preselectedWalletId ? (
                  <div className="flex h-8 items-center gap-2 rounded-md border px-2">
                    <BotIcon size={12} className="shrink-0 text-emerald-500" />
                    <span className="font-mono text-xs">
                      {selectedWallet ? truncateAddress(selectedWallet.address) : ""}
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    disabled={registration.isPending}
                    className="h-8 w-full rounded-md border bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select wallet...</option>
                    {agentWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {truncateAddress(w.address)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Subname
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) =>
                      setLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    disabled={registration.isPending}
                    placeholder="monitor"
                    className="h-8 w-24 rounded-md border bg-transparent px-2 font-mono text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">
                    .{userEnsName || "your-name.eth"}
                  </span>
                </div>
                {previewName && (
                  <p className="mt-1 font-mono text-[10px] text-violet-500">
                    {previewName}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Mandate
                </label>
                <textarea
                  value={mandate}
                  onChange={(e) => setMandate(e.target.value)}
                  disabled={registration.isPending}
                  placeholder="Monitors global conflicts using open-source intelligence"
                  rows={2}
                  className="w-full resize-none rounded-md border bg-transparent px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Sources
                </label>
                <input
                  type="text"
                  value={sources}
                  onChange={(e) => setSources(e.target.value)}
                  disabled={registration.isPending}
                  placeholder="Reuters, AP, GDELT"
                  className="h-8 w-full rounded-md border bg-transparent px-2.5 font-mono text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {registration.error && (
                <p className="text-xs text-red-500">{registration.error}</p>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={handleRegister}
                disabled={!canSubmit}
              >
                {registration.isPending ? (
                  <>
                    <Loader2Icon size={12} className="animate-spin" />
                    Signing transaction {registration.currentStep + 1}/4...
                  </>
                ) : (
                  "Register (4 transactions)"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


function ExplorerLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-0.5 font-mono hover:underline decoration-muted-foreground/30 ${className ?? ""}`}
    >
      {children}
      <ArrowUpRightIcon size={8} className="shrink-0 text-muted-foreground/50" />
    </a>
  )
}

function AgentWalletCard({
  wallet,
  profile,
  onUnlink,
  onDeleteProfile,
  onRegister,
  onLinkWallet,
  isLinking,
  isUnlinking,
}: {
  wallet: { id: string; address: string }
  profile?: { id: string; ensName: string; label: string; mandate: string; sources: string; erc8004AgentId: string | null; registrationStep: number; agentWalletId: string; walletLinkSignature: string | null }
  onUnlink: () => void
  onDeleteProfile: (id: AgentProfileId) => void
  onRegister: () => void
  onLinkWallet: (profileId: AgentProfileId) => void
  isLinking: boolean
  isUnlinking: boolean
}) {
  const isComplete = profile != null && profile.registrationStep >= 4
  const agentId = profile?.erc8004AgentId ?? undefined
  const { data: reputation } = useAgentReputation(agentId)
  const { linked: walletLinked } = useOnchainWallet(agentId)
  const { data: humanId, isLoading: agentBookLoading } = useAgentBookStatus(wallet.address)
  const agentBookOk = humanId !== null && humanId !== undefined

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BotIcon size={12} className={isComplete ? "text-violet-500" : "text-muted-foreground"} />
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {isComplete ? (
            <ExplorerLink href={ensAppUrl(profile.ensName)} className="text-xs font-medium truncate">
              {profile.ensName}
            </ExplorerLink>
          ) : (
            <ExplorerLink href={etherscanUrl("address", wallet.address)} className="text-xs font-medium truncate">
              {truncateAddress(wallet.address)}
            </ExplorerLink>
          )}
          {isComplete && (
            <ExplorerLink href={etherscanUrl("address", wallet.address)} className="text-[10px] text-muted-foreground">
              {truncateAddress(wallet.address)}
            </ExplorerLink>
          )}
        </div>
        <button
          onClick={onUnlink}
          disabled={isUnlinking}
          className="shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-red-500 transition-colors"
          title="Remove agent wallet"
        >
          <Trash2Icon size={10} />
        </button>
      </div>

      {/* Mandate & Sources */}
      {isComplete && profile.mandate && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-1">
          {profile.mandate}{profile.sources ? ` · ${profile.sources}` : ""}
        </p>
      )}

      {/* Inline status row */}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
        {/* AgentBook */}
        <span className="inline-flex items-center gap-0.5 text-muted-foreground">
          AgentBook
          {agentBookLoading ? (
            <Loader2Icon size={8} className="animate-spin" />
          ) : agentBookOk ? (
            <CheckCircle2Icon size={8} className="text-emerald-500" />
          ) : (
            <span className="text-muted-foreground/40">✗</span>
          )}
        </span>

        {/* ERC-8004 */}
        {agentId && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <ExplorerLink href={agentExplorerUrl(agentId)} className="text-[10px] text-violet-500">
              #{agentId}
            </ExplorerLink>
            <CheckCircle2Icon size={8} className="text-emerald-500" />
          </>
        )}

        {/* On-chain wallet */}
        {isComplete && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
              Wallet
              {walletLinked ? (
                <CheckCircle2Icon size={8} className="text-emerald-500" />
              ) : (
                <span className="text-muted-foreground/40">✗</span>
              )}
            </span>
          </>
        )}
      </div>

      {/* Reputation */}
      {isComplete && reputation && (
        <p className="text-[9px] text-muted-foreground">
          {reputation.count > 0
            ? `${reputation.count} feedback · avg ${reputation.value}`
            : "No feedback yet"}
        </p>
      )}

      {/* Action area — only when something needs attention */}
      {!agentBookLoading && !agentBookOk && (
        <CopyBlock code={`npx @worldcoin/agentkit-cli register ${wallet.address}`} />
      )}

      {profile && profile.registrationStep < 4 ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{profile.registrationStep}/4 incomplete</span>
          <button
            onClick={() => onDeleteProfile(profile.id as AgentProfileId)}
            className="text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2Icon size={10} />
          </button>
        </div>
      ) : !isComplete ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] w-full"
          onClick={onRegister}
        >
          Register ENS Identity
        </Button>
      ) : !walletLinked ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] w-full"
          onClick={() => onLinkWallet(profile.id as AgentProfileId)}
          disabled={isLinking}
        >
          {isLinking ? (
            <>
              <Loader2Icon size={10} className="animate-spin" />
              Linking...
            </>
          ) : (
            <>
              <WalletIcon size={10} />
              Link wallet on-chain
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}

function CopyBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`group relative ${className ?? ""}`}>
      <pre className="overflow-x-auto rounded-md border bg-muted/50 p-2.5 text-[10px] leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-1.5 top-1.5 rounded border bg-background p-1 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copied ? <CheckIcon size={10} /> : <CopyIcon size={10} />}
      </button>
    </div>
  )
}
