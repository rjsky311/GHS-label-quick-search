import GHSImage from "@/components/GHSImage";

const SIZE_STYLES = {
  sm: {
    wrap: "gap-1.5",
    tile: "h-10 w-10 rounded-lg p-1",
    image: "h-8 w-8",
    marker: "h-2 w-2",
  },
  md: {
    wrap: "gap-2",
    tile: "h-12 w-12 rounded-lg p-1.5",
    image: "h-9 w-9",
    marker: "h-2.5 w-2.5",
  },
  lg: {
    wrap: "gap-2.5",
    tile: "h-14 w-14 rounded-xl p-1.5",
    image: "h-11 w-11",
    marker: "h-3 w-3",
  },
};

const VARIANT_STYLES = {
  primary: {
    marker: "bg-emerald-600",
    tile: "border-slate-200 bg-white shadow-sm shadow-slate-200/50",
  },
  custom: {
    marker: "bg-blue-700",
    tile: "border-blue-200 bg-blue-50/40 shadow-sm shadow-blue-100/60",
  },
  muted: {
    marker: "bg-slate-300",
    tile: "border-slate-200 bg-white/80 opacity-80",
  },
};

export default function GHSPictogramStrip({
  pictograms = [],
  size = "md",
  variant = "primary",
  markerTitle,
  getName,
  className = "",
}) {
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  if (!pictograms.length) return null;

  return (
    <div
      data-testid="ghs-pictogram-strip"
      data-size={size}
      data-variant={variant}
      className={`inline-flex max-w-full flex-wrap items-center ${sizeStyle.wrap} ${className}`}
    >
      {markerTitle && (
        <span
          className={`shrink-0 rounded-full ${sizeStyle.marker} ${variantStyle.marker}`}
          title={markerTitle}
          aria-label={markerTitle}
        />
      )}
      {pictograms.map((pic, index) => (
        <span
          key={`${pic.code || "ghs"}-${index}`}
          data-testid="ghs-pictogram-tile"
          data-ghs-code={pic.code || ""}
          className={`inline-flex shrink-0 items-center justify-center border ${sizeStyle.tile} ${variantStyle.tile}`}
        >
          <GHSImage
            code={pic.code}
            name={getName ? getName(pic) : pic.name || pic.name_zh}
            className={sizeStyle.image}
            showTooltip
          />
        </span>
      ))}
    </div>
  );
}
