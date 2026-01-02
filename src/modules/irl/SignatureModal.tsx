import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onCancel: () => void;
  onConfirm: (signatureDataUrl: string) => void;
};

export default function SignatureModal({ open, title, subtitle, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const size = useMemo(() => ({ width: 520, height: 180 }), []);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setHasInk(false);
    setIsDrawing(false);
  }, [open, size.height, size.width]);

  const getPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", padding: "1rem" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-lg border border-gray-200 w-full"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          {subtitle && (
            <div className="text-sm text-gray-500" style={{ marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          <div className="text-sm text-gray-600" style={{ marginBottom: 8 }}>
            Dibuja tu firma dentro del recuadro.
          </div>

          <div
            className="border border-gray-300 rounded-lg overflow-hidden bg-white"
            style={{ width: "100%", maxWidth: size.width }}
          >
            <canvas
              ref={canvasRef}
              style={{ width: "100%", height: size.height, touchAction: "none" }}
              onPointerDown={(e) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                const { x, y } = getPos(e);
                ctx.beginPath();
                ctx.moveTo(x, y);
                setIsDrawing(true);
                setHasInk(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!isDrawing) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                const { x, y } = getPos(e);
                ctx.lineTo(x, y);
                ctx.stroke();
              }}
              onPointerUp={() => setIsDrawing(false)}
              onPointerCancel={() => setIsDrawing(false)}
            />
          </div>

          <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
            <button type="button" className="btn-secondary" onClick={clear}>
              Limpiar
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!hasInk}
            onClick={confirm}
          >
            Confirmar firma
          </button>
        </div>
      </div>
    </div>
  );
}
