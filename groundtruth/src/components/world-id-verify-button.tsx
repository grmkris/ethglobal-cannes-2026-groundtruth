"use client"

import { useState } from "react"
import { IDKitRequestWidget, orbLegacy } from "@worldcoin/idkit"
import type { IDKitResult, RpContext } from "@worldcoin/idkit"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/auth-client"
import { useWorldIdVerify } from "@/hooks/use-world-id-verify"
import { env } from "@/env"
import { toast } from "sonner"
import { BadgeCheckIcon, LoaderIcon } from "lucide-react"

export function WorldIdVerifyButton() {
  const { data: sessionData } = useSession()
  const { address } = useAccount()
  const { fetchSignature, verify } = useWorldIdVerify()
  const [open, setOpen] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)
  const [preparing, setPreparing] = useState(false)

  const isVerified = sessionData?.user?.worldIdVerified ?? false

  if (isVerified) {
    return (
      <div className="flex items-center gap-1 text-xs text-emerald-500">
        <BadgeCheckIcon size={14} />
        <span>World ID Verified</span>
      </div>
    )
  }

  async function handleOpen() {
    setPreparing(true)
    try {
      const data = await fetchSignature()
      if (!data) {
        toast.error("Failed to prepare verification")
        return
      }
      setRpContext(data.rp_context)
      setOpen(true)
    } finally {
      setPreparing(false)
    }
  }

  async function handleVerify(result: IDKitResult) {
    await verify.mutateAsync({ result })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={handleOpen}
        disabled={preparing || verify.isPending}
      >
        {preparing || verify.isPending ? (
          <LoaderIcon size={12} className="animate-spin" />
        ) : (
          <BadgeCheckIcon size={12} />
        )}
        Verify with World ID
      </Button>
      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={env.NEXT_PUBLIC_WORLD_APP_ID}
          action="verify-human"
          rp_context={rpContext}
          allow_legacy_proofs={false}
          preset={orbLegacy({ signal: address })}
          handleVerify={handleVerify}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  )
}
