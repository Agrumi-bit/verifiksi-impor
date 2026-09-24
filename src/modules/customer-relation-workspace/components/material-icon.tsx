type Props = {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
};

export function MaterialIcon({ name, className, filled, style }: Props) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={filled ? { fontVariationSettings: "'FILL' 1", ...style } : style}
      data-icon={name}
    >
      {name}
    </span>
  );
}
