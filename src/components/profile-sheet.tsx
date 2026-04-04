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
import { useAccount } from "wagmi"
import {
  BadgeCheckIcon,
  CopyIcon,
  LogOutIcon,
  BotIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"
import { toast } from "sonner"

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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
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

          {/* Agents placeholder */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Agents
            </h3>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6">
              <BotIcon size={20} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                Link your AI agents to your profile
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Coming soon
              </p>
            </div>
          </div>

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
