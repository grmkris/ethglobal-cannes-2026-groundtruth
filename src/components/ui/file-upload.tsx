"use client"

import { useRef } from "react"
import { useFileUpload } from "@/hooks/use-file-upload"
import { ImagePlusIcon, Loader2Icon } from "lucide-react"
import { UPLOAD_ALLOWED_TYPES } from "@/lib/upload-config"
import { Button } from "@/components/ui/button"

export function FileUpload({
  onUpload,
  disabled,
}: {
  onUpload: (url: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, isUploading } = useFileUpload()

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await uploadFile(file)
    if (result) {
      onUpload(result.url)
    }

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ALLOWED_TYPES.join(",")}
        onChange={handleChange}
        disabled={disabled || isUploading}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <Loader2Icon size={14} className="animate-spin" />
        ) : (
          <ImagePlusIcon size={14} />
        )}
        {isUploading ? "Uploading..." : "Add Image"}
      </Button>
    </div>
  )
}
