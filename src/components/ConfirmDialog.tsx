import { useEffect, useRef } from "react";
import { Warning } from "@phosphor-icons/react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onCancel();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onCancel]);

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/40 bg-surface rounded-xl border border-border shadow-lg p-0 max-w-sm w-full"
    >
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <Warning size={24} weight="light" className="text-red-500" />
        </div>
        <h3 className="text-lg font-heading font-bold mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-text/60">{description}</p>
        )}
      </div>
      <div className="flex border-t border-border">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 text-sm font-medium text-text/60 hover:bg-black/5 cursor-pointer transition-colors rounded-bl-xl"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 cursor-pointer transition-colors border-l border-border rounded-br-xl"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
