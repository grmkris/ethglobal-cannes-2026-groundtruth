import type { ChatMessage } from "@/lib/orpc-types"

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const time = new Date(message.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="px-3 py-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold">{message.authorName}</span>
        <span className="text-[10px] text-muted-foreground">{time}</span>
      </div>
      <p className="text-xs leading-relaxed text-foreground/90">
        {message.content}
      </p>
    </div>
  )
}
