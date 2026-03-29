"use client"

import * as React from "react"
import SignaturePad from "signature_pad"
import { Loader2, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { SignatureCanvas } from "@/components/signature-canvas"
import type { FinalizeData } from "@/lib/service-reports"

interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: FinalizeData) => Promise<void>
}

const MIN_STROKE_POINTS = 10

export function SignatureDialog({
  open,
  onOpenChange,
  onConfirm,
}: SignatureDialogProps) {
  const [activeTab, setActiveTab] = React.useState<string>("sign")
  const [signerName, setSignerName] = React.useState("")
  const [refusalReason, setRefusalReason] = React.useState("")
  const [isCanvasEmpty, setIsCanvasEmpty] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)

  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const signaturePadRef = React.useRef<SignaturePad | null>(null)

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setActiveTab("sign")
      setSignerName("")
      setRefusalReason("")
      setIsCanvasEmpty(true)
      setIsSubmitting(false)
      setValidationError(null)
      // Clear pad after next render
      setTimeout(() => {
        signaturePadRef.current?.clear()
      }, 100)
    }
  }, [open])

  // Warn before leaving page with unsaved signature
  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isCanvasEmpty && open) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isCanvasEmpty, open])

  function getSignaturePointCount(): number {
    if (!signaturePadRef.current) return 0
    const data = signaturePadRef.current.toData()
    return data.reduce((total, group) => total + group.points.length, 0)
  }

  async function handleConfirmSignature() {
    setValidationError(null)

    if (isCanvasEmpty) {
      setValidationError("Bitte zeichnen Sie eine Unterschrift.")
      return
    }

    if (getSignaturePointCount() < MIN_STROKE_POINTS) {
      setValidationError(
        "Unterschrift zu kurz, bitte erneut zeichnen."
      )
      return
    }

    if (!signerName.trim()) {
      setValidationError("Bitte geben Sie den Namen des Unterzeichners ein.")
      return
    }

    if (!canvasRef.current) return

    // Export as PNG base64 (JPEG with 0.8 quality for compression as per spec)
    const signatureData = canvasRef.current.toDataURL("image/jpeg", 0.8)

    setIsSubmitting(true)
    try {
      await onConfirm({
        signatureData,
        signerName: signerName.trim(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirmRefusal() {
    setValidationError(null)

    if (!refusalReason.trim()) {
      setValidationError(
        "Bitte geben Sie einen Grund fuer die Verweigerung ein."
      )
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm({
        signatureRefused: true,
        refusalReason: refusalReason.trim(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canConfirmSignature =
    !isCanvasEmpty && signerName.trim().length > 0 && !isSubmitting
  const canConfirmRefusal =
    refusalReason.trim().length > 0 && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Bericht finalisieren</DialogTitle>
          <DialogDescription>
            Nach der Finalisierung kann der Bericht nicht mehr bearbeitet
            werden. Nur ein Admin kann ihn wieder entsperren.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign">Unterschrift</TabsTrigger>
            <TabsTrigger value="refuse">Unterschrift verweigert</TabsTrigger>
          </TabsList>

          <TabsContent value="sign" className="space-y-4 pt-2">
            <SignatureCanvas
              onSignatureChange={setIsCanvasEmpty}
              canvasRef={canvasRef}
              signaturePadRef={signaturePadRef}
            />

            <div className="space-y-2">
              <Label htmlFor="signer-name">
                Name des Unterzeichners <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signer-name"
                placeholder="Vor- und Nachname"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {validationError && activeTab === "sign" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleConfirmSignature}
                disabled={!canConfirmSignature}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Bestaetigen
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="refuse" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="refusal-reason">
                Grund der Verweigerung <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="refusal-reason"
                placeholder="Warum wird die Unterschrift verweigert?"
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                className="min-h-[120px]"
                disabled={isSubmitting}
              />
            </div>

            {validationError && activeTab === "refuse" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRefusal}
                disabled={!canConfirmRefusal}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Verweigerung bestaetigen
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
