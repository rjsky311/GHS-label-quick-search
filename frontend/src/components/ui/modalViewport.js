import { cn } from "@/lib/utils";

export const modalViewportOverlayClassName = (className) =>
  cn(
    "modal-viewport-overlay fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4",
    className,
  );

export const modalViewportPanelClassName = (className) =>
  cn(
    "modal-viewport-panel flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-lg shadow-2xl outline-none",
    className,
  );

export const modalViewportBodyClassName = (className) =>
  cn("modal-viewport-body min-h-0 flex-1 overflow-y-auto", className);

export const modalViewportFooterClassName = (className) =>
  cn("modal-viewport-footer shrink-0 border-t border-slate-200 bg-white", className);
