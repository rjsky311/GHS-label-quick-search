const positiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export const resolveQuickIdPictogramMinSidePx = (expectedMin) =>
  positiveNumber(expectedMin) || 30;

export const resolveQrMinSidePx = (expectedMin) =>
  Math.max(50, positiveNumber(expectedMin));
