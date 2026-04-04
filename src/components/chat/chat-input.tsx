"use client"

import { useState } from "react"
import { SendIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
      <Input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        aria-label="Message"
        className="h-8 flex-1 text-xs"
      />
      <Button
        type="submit"
        size="icon-xs"
        disabled={disabled || !content.trim()}
        aria-label="Send message"
        className="size-8 shrink-0"
      >
        <SendIcon size={12} />
      </Button>
    </form>
  )
}
