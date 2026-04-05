import type { ChatMessage } from "@/lib/orpc-types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { BadgeCheckIcon, BotIcon } from "lucide-react"

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const time = new Date(message.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const initials = (message.authorName || "??").slice(0, 2).toUpperCase()

  return (
    <div className="group flex gap-2.5 px-3 py-2 transition-colors hover:bg-muted/30">
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback className={cn("text-[10px] font-semibold", message.agentAddress ? "bg-violet-500/10 text-violet-500" : "bg-muted text-muted-foreground")}>
          {message.agentAddress ? <BotIcon size={12} /> : initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold">{message.authorName}</span>
          {message.agentAddress && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <BotIcon
                    size={12}
                    className="shrink-0 text-violet-500"
                  />
                }
              />
              <TooltipContent>{message.agentEnsName ?? `Agent ${message.agentAddress.slice(0, 6)}...${message.agentAddress.slice(-4)}`}</TooltipContent>
            </Tooltip>
          )}
          {message.worldIdVerified && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <BadgeCheckIcon
                    size={12}
                    className="shrink-0 text-emerald-500"
                  />
                }
              />
              <TooltipContent>World ID Verified</TooltipContent>
            </Tooltip>
          )}
          <span className="shrink-0 text-[10px] text-muted-foreground/60">{time}</span>
        </div>
        <p className="text-xs leading-relaxed text-foreground/80">
          {message.content}
        </p>
      </div>
    </div>
  )
}
