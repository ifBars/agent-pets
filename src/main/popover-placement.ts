export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PopoverLayoutOptions = {
  appWidth: number;
  petRect: RectLike;
  popoverWidth: number;
  popoverHeight: number;
  gap?: number;
  margin?: number;
  constrainAbove?: boolean;
};

export type PopoverLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  maxHeight: number | null;
};

export function calculatePopoverLayout(options: PopoverLayoutOptions): PopoverLayout {
  const gap = options.gap ?? 8;
  const margin = options.margin ?? 8;
  const width = Math.min(options.popoverWidth, Math.max(0, options.appWidth - margin * 2));
  const availableAbove = Math.max(0, options.petRect.top - gap - margin);
  const needsConstraint = Boolean(options.constrainAbove && options.popoverHeight > availableAbove);
  const height = needsConstraint ? availableAbove : options.popoverHeight;
  const left = clamp(
    options.petRect.left + options.petRect.width / 2 - width / 2,
    margin,
    options.appWidth - width - margin,
  );
  const top = Math.max(margin, options.petRect.top - height - gap);

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
    maxHeight: needsConstraint ? Math.round(height) : null,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
