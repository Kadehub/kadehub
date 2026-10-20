import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True when the browser has the Web Share API (mobile browsers, Safari,
 *  Chrome/Edge on Windows). Always false during server render. */
export function useCanShare(): boolean {
  return useSyncExternalStore(
    noop,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

/** Shares files through the native share sheet when the browser allows it.
 *  Returns "shared", "cancelled" (user dismissed the sheet) or "unsupported". */
export async function shareFiles(
  files: File[],
  data: { title?: string; text?: string },
): Promise<"shared" | "cancelled" | "unsupported"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return "unsupported";
  if (typeof navigator.canShare !== "function" || !navigator.canShare({ files })) return "unsupported";
  try {
    await navigator.share({ files, ...data });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    throw err;
  }
}
