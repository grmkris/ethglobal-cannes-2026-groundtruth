import type { ChatMessage } from "@/lib/orpc-types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const time = new Date(message.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const initials = (message.authorName || "??").slice(0, 2).toUpperCase()

  return (
    <div className="group flex gap-2.5 px-3 py-2 transition-colors hover:bg-muted/30">
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-xs font-semibold">{message.authorName}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground/60">{time}</span>
        </div>
        <p className="text-xs leading-relaxed text-foreground/80">
          {message.content}
        </p>
      </div>
    </div>
  )
}
