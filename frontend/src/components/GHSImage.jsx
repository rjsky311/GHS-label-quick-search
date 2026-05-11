import { useState } from "react";
import { GHS_IMAGES } from "@/constants/ghs";

export default function GHSImage({
  code,
  name,
  className = "h-10 w-10",
  showTooltip = false,
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded border border-red-300 bg-red-100 text-[10px] font-bold text-red-600 ${className}`}
        title={name ? `${code}: ${name}` : code}
      >
        {code}
      </span>
    );
  }

  return (
    <div className={showTooltip ? "group relative inline-flex" : "inline-flex"}>
      <img
        src={GHS_IMAGES[code]}
        alt={name || code}
        loading="lazy"
        className={`block object-contain ${className}`}
        title={name ? `${code}: ${name}` : code}
        onError={() => setHasError(true)}
      />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
          {code}: {name}
        </div>
      )}
    </div>
  );
}
