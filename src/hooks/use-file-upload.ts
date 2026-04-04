"use client"

import { useState } from "react"
import { upload } from "@vercel/blob/client"
import { UPLOAD_MAX_SIZE_BYTES, UPLOAD_ALLOWED_TYPES } from "@/lib/upload-config"
import { toast } from "sonner"

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false)

  async function uploadFile(file: File): Promise<{ url: string } | null> {
    if (file.size > UPLOAD_MAX_SIZE_BYTES) {
      toast.error("File too large", {
        description: `Maximum size is ${UPLOAD_MAX_SIZE_BYTES / 1024 / 1024}MB.`,
      })
      return null
    }

    if (!(UPLOAD_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only JPEG, PNG, WebP, and GIF images are allowed.",
      })
      return null
    }

    setIsUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      })
      return { url: blob.url }
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadFile, isUploading }
}
