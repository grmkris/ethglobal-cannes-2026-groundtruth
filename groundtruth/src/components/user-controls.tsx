"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAppKit } from "@reown/appkit/react"
import { MapControlContainer } from "@/components/ui/map"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ProfileSheet } from "@/components/profile-sheet"
import { useSession } from "@/lib/auth-client"
import { WalletIcon } from "lucide-react"

export function UserControls() {
  const { data: sessionData } = useSession()
  const isSignedIn = !!sessionData?.session
  const user = sessionData?.user
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

  const displayName = user?.name || "User"
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <>
      <MapControlContainer className="absolute top-2 right-2 z-[1000]">
        {isSignedIn && user ? (
          <button
            onClick={() => setProfileOpen(true)}
            className="rounded-full shadow-lg ring-2 ring-background transition-opacity hover:opacity-80"
          >
            <Avatar size="default">
              {user.image && <AvatarImage src={user.image} alt={displayName} />}
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
            className="bg-background/90 shadow-lg backdrop-blur-md"
          >
            <WalletIcon size={14} />
            Connect
          </Button>
        )}
      </MapControlContainer>

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
