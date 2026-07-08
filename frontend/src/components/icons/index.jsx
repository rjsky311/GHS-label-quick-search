import { forwardRef } from "react";

const ACCENT = "var(--notebook-icon-accent, hsl(var(--notebook-action)))";
const DANGER = "var(--notebook-icon-danger, hsl(var(--notebook-danger)))";
const DEFAULT_STROKE_WIDTH = 1.9;

const IconBase = forwardRef(
  (
    {
      children,
      color = "currentColor",
      size = 24,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      absoluteStrokeWidth: _absoluteStrokeWidth,
      ...props
    },
    ref,
  ) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  ),
);
IconBase.displayName = "IconBase";

const createIcon = (displayName, children) => {
  const Icon = forwardRef((props, ref) => (
    <IconBase ref={ref} {...props}>
      {children}
    </IconBase>
  ));
  Icon.displayName = displayName;
  return Icon;
};

const DocumentShell = ({ children }) => (
  <>
    <path d="M7 3.8h7l4 4v12.4H7z" />
    <path d="M14 3.8V8h4" />
    {children}
  </>
);

const ClipboardShell = ({ children }) => (
  <>
    <rect x="5" y="5" width="14" height="16" rx="2" />
    <path d="M9 4h6v3H9z" stroke={ACCENT} />
    {children}
  </>
);

export const Activity = createIcon(
  "Activity",
  <path d="M3.5 12h4l2.2-6.2 4.4 12.4 2.2-6.2h4.2" />,
);

export const AlertTriangle = createIcon(
  "AlertTriangle",
  <>
    <path d="M12 3.8 21 19H3z" />
    <path d="M12 8.5v5" />
    <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
  </>,
);

export const ArrowDown = createIcon(
  "ArrowDown",
  <>
    <path d="M12 4.5v14" />
    <path d="m6.5 13.5 5.5 5.5 5.5-5.5" />
  </>,
);

export const ArrowLeft = createIcon(
  "ArrowLeft",
  <>
    <path d="M19.5 12h-15" />
    <path d="m10 6.5-5.5 5.5 5.5 5.5" />
  </>,
);

export const ArrowRight = createIcon(
  "ArrowRight",
  <>
    <path d="M4.5 12h15" />
    <path d="m14 6.5 5.5 5.5-5.5 5.5" />
  </>,
);

export const ArrowUp = createIcon(
  "ArrowUp",
  <>
    <path d="M12 19.5v-14" />
    <path d="m6.5 10.5 5.5-5.5 5.5 5.5" />
  </>,
);

export const ArrowUpDown = createIcon(
  "ArrowUpDown",
  <>
    <path d="M8 4.5v15" />
    <path d="m4.5 8 3.5-3.5L11.5 8" />
    <path d="M16 19.5v-15" />
    <path d="m12.5 16 3.5 3.5 3.5-3.5" />
  </>,
);

export const BookOpen = createIcon(
  "BookOpen",
  <>
    <path d="M4.5 5.2h5.2A3.3 3.3 0 0 1 13 8.5v11a3.8 3.8 0 0 0-3.3-1.8H4.5z" />
    <path d="M19.5 5.2h-5.2A3.3 3.3 0 0 0 11 8.5v11a3.8 3.8 0 0 1 3.3-1.8h5.2z" />
    <path d="M12 8.3v11.2" stroke={ACCENT} />
  </>,
);

export const BookPlus = createIcon(
  "BookPlus",
  <>
    <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v13H7.2A2.2 2.2 0 0 1 5 17.8z" />
    <path d="M5 17.8A2.2 2.2 0 0 1 7.2 15.6H19" />
    <path d="M12 7.5v5" stroke={ACCENT} />
    <path d="M9.5 10h5" stroke={ACCENT} />
  </>,
);

export const Bookmark = createIcon(
  "Bookmark",
  <path d="M7 4.5h10v15l-5-3.1-5 3.1z" />,
);

export const Building2 = createIcon(
  "Building2",
  <>
    <path d="M5 20.5V6.2l7-3v17.3" />
    <path d="M12 8h7v12.5" />
    <path d="M8 9.2h1.4M8 12.3h1.4M8 15.4h1.4M15 11.2h1.4M15 14.3h1.4" stroke={ACCENT} />
    <path d="M3.8 20.5h16.4" />
  </>,
);

export const CalendarDays = createIcon(
  "CalendarDays",
  <>
    <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
    <path d="M8 3.8v3.4M16 3.8v3.4M4.5 9.5h15" />
    <path d="M8.5 13h.1M12 13h.1M15.5 13h.1M8.5 16h.1M12 16h.1" stroke={ACCENT} />
  </>,
);

export const Check = createIcon("Check", <path d="m4.8 12.5 4.4 4.4 10-10.2" />);

export const CheckCircle2 = createIcon(
  "CheckCircle2",
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="m8.2 12.2 2.6 2.6 5.2-5.8" stroke={ACCENT} />
  </>,
);

export const ChevronDown = createIcon("ChevronDown", <path d="m6 9.5 6 6 6-6" />);
export const ChevronLeft = createIcon("ChevronLeft", <path d="m15 6-6 6 6 6" />);
export const ChevronRight = createIcon("ChevronRight", <path d="m9 6 6 6-6 6" />);
export const ChevronUp = createIcon("ChevronUp", <path d="m6 14.5 6-6 6 6" />);

export const Circle = createIcon("Circle", <circle cx="12" cy="12" r="7.6" />);

export const CircleDot = createIcon(
  "CircleDot",
  <>
    <circle cx="12" cy="12" r="7.6" />
    <circle cx="12" cy="12" r="2" fill={ACCENT} stroke="none" />
  </>,
);

export const ClipboardCheck = createIcon(
  "ClipboardCheck",
  <ClipboardShell>
    <path d="m8.5 13.2 2 2 4.8-5.1" stroke={ACCENT} />
    <path d="M8.5 18h6.5" />
  </ClipboardShell>,
);

export const ClipboardList = createIcon(
  "ClipboardList",
  <ClipboardShell>
    <path d="M8.4 11h7.2M8.4 14.5h7.2M8.4 18h4.5" />
  </ClipboardShell>,
);

export const Clock = createIcon(
  "Clock",
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.5V12l3.2 2" stroke={ACCENT} />
  </>,
);

export const Clock3 = Clock;

export const Copy = createIcon(
  "Copy",
  <>
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <path d="M5 15.5V6.8A1.8 1.8 0 0 1 6.8 5h8.7" stroke={ACCENT} />
  </>,
);

export const Database = createIcon(
  "Database",
  <>
    <ellipse cx="12" cy="6.2" rx="7" ry="3" />
    <path d="M5 6.2v5.8c0 1.7 3.1 3 7 3s7-1.3 7-3V6.2" />
    <path d="M5 12v5.8c0 1.7 3.1 3 7 3s7-1.3 7-3V12" />
    <path d="M8.2 12.8a12 12 0 0 0 7.6 0" stroke={ACCENT} />
  </>,
);

export const Download = createIcon(
  "Download",
  <>
    <path d="M5 20h14" />
    <path d="M12 4v11" stroke={ACCENT} />
    <path d="m8 11 4 4 4-4" stroke={ACCENT} />
  </>,
);

export const ExternalLink = createIcon(
  "ExternalLink",
  <>
    <path d="M13 5h6v6" stroke={ACCENT} />
    <path d="m19 5-8 8" stroke={ACCENT} />
    <path d="M17 14v4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 18V8.5A1.5 1.5 0 0 1 6.5 7H10" />
  </>,
);

export const FileCheck2 = createIcon(
  "FileCheck2",
  <DocumentShell>
    <path d="m9 14 2 2 4.5-5" stroke={ACCENT} />
  </DocumentShell>,
);

export const FileSpreadsheet = createIcon(
  "FileSpreadsheet",
  <DocumentShell>
    <path d="M8.8 12h7.4M8.8 15h7.4M11.5 9.2v8.6M14.5 12v5.8" stroke={ACCENT} />
  </DocumentShell>,
);

export const FileText = createIcon(
  "FileText",
  <DocumentShell>
    <path d="M9 12h6M9 15h6M9 18h3.5" />
  </DocumentShell>,
);

export const Filter = createIcon(
  "Filter",
  <>
    <path d="M4.5 6h15" />
    <path d="M7.2 12h9.6" stroke={ACCENT} />
    <path d="M10 18h4" />
  </>,
);

export const FlaskConical = createIcon(
  "FlaskConical",
  <>
    <path d="M9 3.5h6M10 3.5v5.8l-4.4 8.1a2 2 0 0 0 1.8 3h9.2a2 2 0 0 0 1.8-3L14 9.3V3.5" />
    <path d="M7.4 15.5h9.2" stroke={ACCENT} />
    <circle cx="10.2" cy="18" r=".75" fill={ACCENT} stroke="none" />
    <circle cx="13.8" cy="18.5" r=".75" fill={ACCENT} stroke="none" />
  </>,
);

export const Globe = createIcon(
  "Globe",
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M4.2 12h15.6" />
    <path d="M12 3.8c2.4 2.4 3.5 5.2 3.5 8.2s-1.1 5.8-3.5 8.2" stroke={ACCENT} />
    <path d="M12 3.8C9.6 6.2 8.5 9 8.5 12s1.1 5.8 3.5 8.2" stroke={ACCENT} />
  </>,
);

export const GripVertical = createIcon(
  "GripVertical",
  <>
    <circle cx="9" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none" />
    <circle cx="9" cy="17.5" r=".8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="17.5" r=".8" fill="currentColor" stroke="none" />
  </>,
);

export const Info = createIcon(
  "Info",
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r=".9" fill={ACCENT} stroke="none" />
  </>,
);

export const KeyRound = createIcon(
  "KeyRound",
  <>
    <circle cx="8.5" cy="12" r="4.2" />
    <path d="M12.7 12h7.3" stroke={ACCENT} />
    <path d="M17 12v3M20 12v2" stroke={ACCENT} />
  </>,
);

export const Languages = createIcon(
  "Languages",
  <>
    <path d="M4.5 5.5h8.5M8.8 3.8v1.7M6.2 9.2c1.5 3.1 3.8 5.3 6.8 6.8" />
    <path d="M12.4 5.5c-.7 4.2-3.3 8-7.4 10.7" stroke={ACCENT} />
    <path d="m14.5 20 3.8-8.6L22 20M16 16.8h4.7" />
  </>,
);

export const LayoutGrid = createIcon(
  "LayoutGrid",
  <>
    <rect x="4.5" y="4.5" width="6" height="6" rx="1.2" />
    <rect x="13.5" y="4.5" width="6" height="6" rx="1.2" stroke={ACCENT} />
    <rect x="4.5" y="13.5" width="6" height="6" rx="1.2" />
    <rect x="13.5" y="13.5" width="6" height="6" rx="1.2" />
  </>,
);

export const LayoutPanelTop = createIcon(
  "LayoutPanelTop",
  <>
    <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
    <path d="M4.5 9.5h15" stroke={ACCENT} />
    <path d="M9.5 9.5v10" />
  </>,
);

export const Lightbulb = createIcon(
  "Lightbulb",
  <>
    <path d="M8 11.2a4.2 4.2 0 1 1 8 0c-.5 1.5-1.8 2.2-2.1 4H10c-.3-1.8-1.6-2.5-2-4z" />
    <path d="M10 18h4M10.8 21h2.4" />
    <path d="M12 3.2v1.6M5.3 6.1l1.1 1.1M18.7 6.1l-1.1 1.1" stroke={ACCENT} />
  </>,
);

export const Link2 = createIcon(
  "Link2",
  <>
    <path d="M9.5 14.5 14.5 9.5" stroke={ACCENT} />
    <path d="M11 6.5 12.2 5.3a4 4 0 0 1 5.6 5.6l-1.6 1.6" />
    <path d="M13 17.5 11.8 18.7a4 4 0 0 1-5.6-5.6l1.6-1.6" />
  </>,
);

export const Loader2 = createIcon(
  "Loader2",
  <>
    <path d="M12 3.8a8.2 8.2 0 1 1-7.4 4.7" />
    <path d="M4.4 4.9 4.6 8.5 8.2 8.2" stroke={ACCENT} />
  </>,
);

export const LockKeyhole = createIcon(
  "LockKeyhole",
  <>
    <rect x="5.5" y="10" width="13" height="10" rx="2" />
    <path d="M8.2 10V7.8a3.8 3.8 0 0 1 7.6 0V10" />
    <path d="M12 14v2.3" stroke={ACCENT} />
    <circle cx="12" cy="13.2" r=".75" fill={ACCENT} stroke="none" />
  </>,
);

export const MapPin = createIcon(
  "MapPin",
  <>
    <path d="M12 21s6.2-5.5 6.2-11.1a6.2 6.2 0 0 0-12.4 0C5.8 15.5 12 21 12 21z" />
    <circle cx="12" cy="9.8" r="2.1" stroke={ACCENT} />
  </>,
);

export const MessageSquarePlus = createIcon(
  "MessageSquarePlus",
  <>
    <path d="M5 5h14v10.5a2 2 0 0 1-2 2H9l-4 3z" />
    <path d="M12 8.2v5.2M9.4 10.8h5.2" stroke={ACCENT} />
  </>,
);

export const Minus = createIcon("Minus", <path d="M5 12h14" />);

export const Moon = createIcon(
  "Moon",
  <path d="M19.2 15.2a7.4 7.4 0 0 1-10.4-10 8.6 8.6 0 1 0 10.4 10z" />,
);

export const MoreHorizontal = createIcon(
  "MoreHorizontal",
  <>
    <circle cx="6.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="12" r="1" fill="currentColor" stroke="none" />
  </>,
);

export const Palette = createIcon(
  "Palette",
  <>
    <path d="M12.2 4.2a7.8 7.8 0 0 0 0 15.6h1.6a1.8 1.8 0 0 0 1.2-3.1 1.7 1.7 0 0 1 1.1-2.9h1.1a3 3 0 0 0 2.9-3.6 8 8 0 0 0-7.9-6z" />
    <circle cx="8.5" cy="10" r=".85" fill={ACCENT} stroke="none" />
    <circle cx="11.4" cy="8" r=".85" fill={ACCENT} stroke="none" />
    <circle cx="14.5" cy="9" r=".85" fill={ACCENT} stroke="none" />
  </>,
);

export const PenLine = createIcon(
  "PenLine",
  <>
    <path d="M4.5 19.5h15" />
    <path d="m13.5 5.3 5.2 5.2-8.4 8.4-5.4 1.1 1.1-5.4z" stroke={ACCENT} />
  </>,
);

export const Phone = createIcon(
  "Phone",
  <path d="M6.6 4.8 9.5 4l2 4-1.8 1.4a11.7 11.7 0 0 0 4.9 4.9l1.4-1.8 4 2-.8 2.9a2 2 0 0 1-2.2 1.5A15.3 15.3 0 0 1 5.1 7a2 2 0 0 1 1.5-2.2z" />,
);

export const Plus = createIcon(
  "Plus",
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const Printer = createIcon(
  "Printer",
  <>
    <path d="M7 9V4h10v5" />
    <path d="M6 9h12a2 2 0 0 1 2 2v5h-3M7 16H4v-5a2 2 0 0 1 2-2" />
    <rect x="7" y="14" width="10" height="6" rx="1" stroke={ACCENT} />
    <path d="M17 12h.1" />
  </>,
);

export const QrCode = createIcon(
  "QrCode",
  <>
    <rect x="4.5" y="4.5" width="5" height="5" rx="1" />
    <rect x="14.5" y="4.5" width="5" height="5" rx="1" />
    <rect x="4.5" y="14.5" width="5" height="5" rx="1" />
    <path d="M14.5 14.5h2.8v2.8h-2.8zM19.5 14.5v5M14.5 19.5h2" stroke={ACCENT} />
  </>,
);

export const RefreshCw = createIcon(
  "RefreshCw",
  <>
    <path d="M19 7.5A7.7 7.7 0 0 0 5 9.8" />
    <path d="M19 4.5v3h-3" stroke={ACCENT} />
    <path d="M5 16.5a7.7 7.7 0 0 0 14-2.3" />
    <path d="M5 19.5v-3h3" stroke={ACCENT} />
  </>,
);

export const RotateCcw = createIcon(
  "RotateCcw",
  <>
    <path d="M7 7.5h-3v-3" stroke={ACCENT} />
    <path d="M4.4 7.5a8 8 0 1 1 .9 9.8" />
  </>,
);

export const Save = createIcon(
  "Save",
  <>
    <path d="M5 4.5h12l2 2v13H5z" />
    <path d="M8 4.5v5h7v-5" />
    <rect x="8" y="14" width="8" height="5.5" rx="1" stroke={ACCENT} />
  </>,
);

export const Search = createIcon(
  "Search",
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" stroke={ACCENT} />
  </>,
);

export const Send = createIcon(
  "Send",
  <>
    <path d="m4.2 11.8 15.8-7-5.1 15.3-3.2-6.5z" />
    <path d="m20 4.8-8.3 8.8" stroke={ACCENT} />
  </>,
);

export const Settings2 = createIcon(
  "Settings2",
  <>
    <path d="M4.5 7.5h7M15 7.5h4.5" />
    <circle cx="13.2" cy="7.5" r="1.8" stroke={ACCENT} />
    <path d="M4.5 16.5h4.7M12.8 16.5h6.7" />
    <circle cx="11" cy="16.5" r="1.8" stroke={ACCENT} />
  </>,
);

export const ShieldAlert = createIcon(
  "ShieldAlert",
  <>
    <path d="M12 3.5 19 6v5.5c0 4.1-2.9 7.3-7 8.7-4.1-1.4-7-4.6-7-8.7V6z" />
    <path d="M12 8.2v4.2" />
    <circle cx="12" cy="15.4" r=".9" fill={DANGER} stroke="none" />
  </>,
);

export const ShieldCheck = createIcon(
  "ShieldCheck",
  <>
    <path d="M12 3.5 19 6v5.5c0 4.1-2.9 7.3-7 8.7-4.1-1.4-7-4.6-7-8.7V6z" />
    <path d="m8.8 12.2 2.2 2.2 4.4-5" stroke={ACCENT} />
  </>,
);

export const Star = createIcon(
  "Star",
  <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z" />,
);

export const Sun = createIcon(
  "Sun",
  <>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" stroke={ACCENT} />
  </>,
);

export const Tag = createIcon(
  "Tag",
  <>
    <path d="M4.5 11V5h6l9 9-5.5 5.5z" />
    <circle cx="8.2" cy="8.2" r="1" fill={ACCENT} stroke="none" />
  </>,
);

export const Tags = createIcon(
  "Tags",
  <>
    <path d="M4.5 10.7V5.2h5.5l8.4 8.4-5.2 5.2z" />
    <path d="M10.2 4.8h2.7l7.2 7.2-4.5 4.5" stroke={ACCENT} />
    <circle cx="7.8" cy="8" r=".85" fill={ACCENT} stroke="none" />
  </>,
);

export const Target = createIcon(
  "Target",
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.4" fill={ACCENT} stroke="none" />
  </>,
);

export const Trash2 = createIcon(
  "Trash2",
  <>
    <path d="M4.5 7h15" />
    <path d="M9 7V4.5h6V7" />
    <path d="M7 7.5 8 20h8l1-12.5" />
    <path d="M10.5 11v5.5M13.5 11v5.5" stroke={ACCENT} />
  </>,
);

export const X = createIcon(
  "X",
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>,
);
