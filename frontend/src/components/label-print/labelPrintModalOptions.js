import {
  BookOpen,
  ClipboardList,
  FileText,
  QrCode,
  Target,
} from "lucide-react";

export const TEMPLATE_OPTIONS = [
  {
    value: "icon",
    labelKey: "label.templateIcon",
    descKey: "label.templateIconDesc",
    tipKey: "label.templateIconTip",
    icon: Target,
  },
  {
    value: "standard",
    labelKey: "label.templateStandard",
    descKey: "label.templateStandardDesc",
    tipKey: "label.templateStandardTip",
    icon: ClipboardList,
  },
  {
    value: "full",
    labelKey: "label.templateFull",
    descKey: "label.templateFullDesc",
    tipKey: "label.templateFullTip",
    icon: FileText,
  },
  {
    value: "qrcode",
    labelKey: "label.templateQR",
    descKey: "label.templateQRDesc",
    tipKey: "label.templateQRTip",
    icon: QrCode,
  },
];

export const SIZE_OPTIONS = [
  {
    value: "small",
    labelKey: "label.sizeSmall",
    descKey: "label.sizeSmallDesc",
    tipKey: "label.sizeSmallTip",
  },
  {
    value: "medium",
    labelKey: "label.sizeMedium",
    descKey: "label.sizeMediumDesc",
    tipKey: "label.sizeMediumTip",
  },
  {
    value: "large",
    labelKey: "label.sizeLarge",
    descKey: "label.sizeLargeDesc",
    tipKey: "label.sizeLargeTip",
  },
];

export const ORIENTATION_OPTIONS = [
  {
    value: "portrait",
    labelKey: "label.portrait",
    descKey: "label.portraitDesc",
    icon: FileText,
  },
  {
    value: "landscape",
    labelKey: "label.landscape",
    descKey: "label.landscapeDesc",
    icon: BookOpen,
  },
];

export const COLOR_OPTIONS = [
  { value: "color", labelKey: "label.colorColor", iconLabel: "CMYK" },
  { value: "bw", labelKey: "label.colorBW", iconLabel: "B/W" },
];

export const NAME_DISPLAY_OPTIONS = [
  {
    value: "both",
    labelKey: "label.nameDisplayBoth",
    descKey: "label.nameDisplayBothDesc",
    iconLabel: "中/EN",
  },
  {
    value: "en",
    labelKey: "label.nameDisplayEnglish",
    descKey: "label.nameDisplayEnglishDesc",
    iconLabel: "EN",
  },
  {
    value: "zh",
    labelKey: "label.nameDisplayChinese",
    descKey: "label.nameDisplayChineseDesc",
    iconLabel: "中",
  },
];

export const PRINT_TARGET_OPTIONS = [
  {
    value: "complete",
    purpose: "shipping",
    labelKey: "label.targetComplete",
    descKey: "label.targetCompleteDesc",
    fallbackLabel: "Complete A4/Letter label",
    fallbackDesc:
      "Full information label with CAS, English, Chinese, every GHS pictogram, H/P statements, and QR.",
    icon: FileText,
    presetId: "a4-primary",
    template: "full",
  },
  {
    value: "qrSupplement",
    purpose: "qrSupplement",
    labelKey: "label.targetQrSmall",
    descKey: "label.targetQrSmallDesc",
    fallbackLabel: "QR small label",
    fallbackDesc:
      "Small label with CAS, the selected identity language, QR, and all GHS pictograms across extra labels.",
    icon: QrCode,
    presetId: "brother-62mm-continuous",
    template: "qrcode",
  },
  {
    value: "quickId",
    purpose: "quickId",
    labelKey: "label.targetIdentitySmall",
    descKey: "label.targetIdentitySmallDesc",
    fallbackLabel: "Identification small label",
    fallbackDesc:
      "Small label with CAS, the selected identity language, and all GHS pictograms across extra labels.",
    icon: Target,
    presetId: "small-strip",
    template: "icon",
  },
];
