"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAppKit } from "@reown/appkit/react"
import { useAccount } from "wagmi"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ProfileSheet } from "@/components/profile-sheet"
import { useSession } from "@/lib/auth-client"
import { useReownIdentity } from "@/hooks/use-reown-identity"
import { client } from "@/lib/orpc"
import { WalletIcon } from "lucide-react"

export function UserControls() {
  const { data: sessionData } = useSession()
  const isSignedIn = !!sessionData?.session
  const user = sessionData?.user
  const { address } = useAccount()
  const identity = useReownIdentity(address)
  const { open } = useAppKit()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [linkAgentAddress, setLinkAgentAddress] = useState<string>()

  // Auto-open profile sheet when ?link-agent=ADDRESS is in URL
  useEffect(() => {
    const addr = searchParams.get("link-agent")
    if (addr && isSignedIn) {
      setLinkAgentAddress(addr)
      setProfileOpen(true)
      // Clean URL
      const url = new URL(window.location.href)
      url.searchParams.delete("link-agent")
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, isSignedIn, router])

  // Once per session, refresh the persisted user.name + user.image from the
  // Reown Identity API. The SIWE plugin only resolves ENS at signup, so this
  // keeps server-rendered fields (chat author, event creator, agent gating) in
  // sync if the user set their primary ENS after signup.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    void client.auth.refreshIdentity().catch((err) => {
      console.error("[user-controls] auth.refreshIdentity failed", err)
    })
  }, [userId])

  const storedName =
    user?.name && !/^0x[a-fA-F0-9]{40}$/.test(user.name) ? user.name : null
  const displayName = identity.name ?? storedName ?? "User"
  const avatarSrc = identity.avatar ?? user?.image ?? null
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <>
      {isSignedIn && user ? (
        <button
          onClick={() => setProfileOpen(true)}
          className="rounded-full ring-2 ring-background transition-opacity hover:opacity-80"
        >
          <Avatar size="default">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            {user.worldIdVerified && (
              <AvatarBadge className="bg-emerald-500" />
            )}
          </Avatar>
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => open()}
        >
          <WalletIcon size={14} />
          Connect
        </Button>
      )}

      <ProfileSheet
        open={profileOpen}
        onOpenChange={(open) => {
          setProfileOpen(open)
          if (!open) setLinkAgentAddress(undefined)
        }}
        defaultAgentAddress={linkAgentAddress}
      />
    </>
  )
}
