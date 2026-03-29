"use client"

import * as React from "react"
import SignaturePad from "signature_pad"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

interface SignatureCanvasProps {
  onSignatureChange: (isEmpty: boolean) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  signaturePadRef: React.MutableRefObject<SignaturePad | null>
}

export function SignatureCanvas({
  onSignatureChange,
  canvasRef,
  signaturePadRef,
}: SignatureCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    })

    signaturePadRef.current = pad

    function handleEndStroke() {
      onSignatureChange(pad.isEmpty())
    }
    pad.addEventListener("endStroke", handleEndStroke)

    function resizeCanvas() {
      if (!canvas || !containerRef.current) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const containerWidth = containerRef.current.clientWidth
      const height = 200

      canvas.width = containerWidth * ratio
      canvas.height = height * ratio
      canvas.style.width = `${containerWidth}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(ratio, ratio)
      }

      pad.clear()
      onSignatureChange(true)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => {
      pad.removeEventListener("endStroke", handleEndStroke)
      window.removeEventListener("resize", resizeCanvas)
      pad.off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClear() {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
      onSignatureChange(true)
    }
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full rounded-md border border-input bg-white"
      >
        <canvas
          ref={canvasRef}
          className="touch-none"
          aria-label="Unterschrift zeichnen"
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Zuruecksetzen
        </Button>
      </div>
    </div>
  )
}
