import { AlertTriangle } from "lucide-react";
import type { Notice } from "../../types";

interface Props {
  notices: Notice[];
}

/** Persistent scrolling banner for active emergency notices — sits right
 * under the header on every main view. Unlike a blocking modal, this never
 * forces an interaction; it just stays visible for as long as the notice
 * is active, so it can't be missed but also doesn't get in the way. */
export default function EmergencyMarquee({ notices }: Props) {
  if (notices.length === 0) return null;

  const items = notices.map((n) => `${n.title} — ${n.content}`);

  return (
    <div className="relative z-20 mx-4 mt-2 sm:mx-8" role="alert">
      <div className="mx-auto max-w-2xl h-9 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 overflow-hidden">
        <div className="marquee-container flex items-center h-full">
          <div className="animate-marquee inline-flex items-center" style={{ willChange: "transform" }}>
            {[...items, ...items].map((text, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-6 whitespace-nowrap">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span className="text-xs font-semibold tracking-wide">{text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
