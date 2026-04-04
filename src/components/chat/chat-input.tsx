"use client"

import { useState } from "react"
import { SendIcon } from "lucide-react"

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void
  disabled?: boolean
}) {
  const [content, setContent] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    onSend(trimmed)
    setContent("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-1.5 border-t px-2 py-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-foreground/20"
      />
      <button
        type="submit"
        disabled={disabled || !content.trim()}
        className="flex size-7 items-center justify-center rounded-md bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-30"
      >
        <SendIcon size={12} />
      </button>
    </form>
  )
}
