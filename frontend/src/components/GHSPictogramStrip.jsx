import GHSImage from "@/components/GHSImage";

const SIZE_STYLES = {
  xs: {
    wrap: "gap-1",
    tile: "h-8 w-8 rounded-md p-0.5",
    image: "h-7 w-7",
    code: "text-[8px]",
  },
  sm: {
    wrap: "gap-1.5",
    tile: "h-9 w-9 rounded-md p-0.5",
    image: "h-8 w-8",
    code: "text-[9px]",
  },
  md: {
    wrap: "gap-1.5",
    tile: "h-11 w-11 rounded-md p-0.5",
    image: "h-10 w-10",
    code: "text-[10px]",
  },
  lg: {
    wrap: "gap-2",
    tile: "h-14 w-14 rounded-md p-1",
    image: "h-12 w-12",
    code: "text-[11px]",
  },
};

const VARIANT_STYLES = {
  primary: {
    tile: "border-slate-200 bg-white shadow-sm shadow-slate-200/30",
    code: "text-slate-500",
  },
  custom: {
    tile: "border-blue-200 bg-blue-50/60 shadow-sm shadow-blue-100/50",
    code: "text-blue-700",
  },
  muted: {
    tile: "border-slate-200 bg-white/90",
    code: "text-slate-500",
  },
  comparison: {
    tile: "border-slate-200 bg-white shadow-sm shadow-slate-200/30",
    code: "text-slate-500",
  },
};

export default function GHSPictogramStrip({
  pictograms = [],
  size = "md",
  variant = "primary",
  markerTitle,
  getName,
  showCodes = false,
  className = "",
}) {
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  if (!pictograms.length) return null;

  return (
    <div
      role={markerTitle ? "group" : undefined}
      aria-label={markerTitle || undefined}
      title={markerTitle || undefined}
      data-testid="ghs-pictogram-strip"
      data-size={size}
      data-variant={variant}
      data-count={pictograms.length}
      className={`inline-flex max-w-full flex-wrap items-center ${sizeStyle.wrap} ${className}`}
    >
      {pictograms.map((pic, index) => (
        <span
          key={`${pic.code || "ghs"}-${index}`}
          data-testid="ghs-pictogram-tile"
          data-ghs-code={pic.code || ""}
          className="inline-flex shrink-0 flex-col items-center gap-0.5"
        >
          <span
            data-testid="ghs-pictogram-frame"
            className={`inline-flex shrink-0 items-center justify-center border ${sizeStyle.tile} ${variantStyle.tile}`}
          >
            <GHSImage
              code={pic.code}
              name={getName ? getName(pic) : pic.name || pic.name_zh}
              className={sizeStyle.image}
              showTooltip
            />
          </span>
          {showCodes && (
            <span
              data-testid="ghs-pictogram-code"
              className={`font-mono leading-none ${sizeStyle.code} ${variantStyle.code}`}
            >
              {pic.code}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
