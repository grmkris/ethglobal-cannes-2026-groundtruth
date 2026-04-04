"use client"

import { useEffect, useRef, useState } from "react"
import { MapControlContainer } from "@/components/ui/map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChat } from "@/hooks/use-chat"
import type { WorldEventId } from "@/lib/typeid"
import { ChevronLeftIcon, ChevronRightIcon, MessageCircleIcon } from "lucide-react"
import { ChatInput } from "./chat-input"
import { ChatMessageItem } from "./chat-message"

const AUTHOR_NAME_KEY = "groundtruth-author-name"

function getStoredAuthorName(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(AUTHOR_NAME_KEY) ?? ""
}

function setStoredAuthorName(name: string) {
  localStorage.setItem(AUTHOR_NAME_KEY, name)
}

export function ChatPanel({ eventId }: { eventId?: WorldEventId | null }) {
  const [collapsed, setCollapsed] = useState(true)
  const [authorName, setAuthorName] = useState(getStoredAuthorName)
  const [showNameInput, setShowNameInput] = useState(!getStoredAuthorName())
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, send } = useChat(eventId)
  const messageList = messages.data ?? []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messageList.length])

  function handleSend(content: string) {
    if (!authorName.trim()) {
      setShowNameInput(true)
      return
    }
    send.mutate({ authorName, content })
  }

  function handleSetName(e: React.FormEvent) {
    e.preventDefault()
    if (authorName.trim()) {
      setStoredAuthorName(authorName.trim())
      setShowNameInput(false)
    }
  }

  const title = eventId ? "Event Chat" : "Global Chat"

  return (
    <MapControlContainer
      className={`absolute top-2 right-14 z-[1000] transition-all duration-300 ${
        collapsed ? "w-10" : "w-72"
      }`}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="flex size-10 items-center justify-center rounded-lg border bg-background/90 shadow-lg backdrop-blur-md hover:bg-muted"
        >
          <MessageCircleIcon size={16} />
        </button>
      ) : (
        <div className="flex h-[400px] flex-col rounded-lg border bg-background/90 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-xs font-semibold">{title}</h3>
            <button
              onClick={() => setCollapsed(true)}
              className="flex size-5 items-center justify-center rounded hover:bg-muted"
            >
              <ChevronRightIcon size={12} />
            </button>
          </div>

          {showNameInput ? (
            <form onSubmit={handleSetName} className="flex flex-col gap-2 p-3">
              <p className="text-xs text-muted-foreground">
                Choose a display name:
              </p>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Anonymous"
                className="rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!authorName.trim()}
                className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-30"
              >
                Set name
              </button>
            </form>
          ) : (
            <>
              <ScrollArea className="flex-1 overflow-hidden">
                <div ref={scrollRef} className="flex flex-col">
                  {messageList.length === 0 ? (
                    <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                      No messages yet
                    </p>
                  ) : (
                    messageList.map((msg) => (
                      <ChatMessageItem key={msg.id} message={msg} />
                    ))
                  )}
                </div>
              </ScrollArea>
              <ChatInput onSend={handleSend} disabled={send.isPending} />
            </>
          )}
        </div>
      )}
    </MapControlContainer>
  )
}
