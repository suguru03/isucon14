import { FC, PropsWithChildren } from "react";

type Size = "xl" | "lg" | "sm" | "xs";

type Variant = "danger";

type TextProps = PropsWithChildren<{
  tagName?: 'p' | 'div'
  bold?: boolean;
  size?: Size;
  variant?: Variant;
  className?: string;
}>;

const getSizeClass = (size?: Size) => {
  switch (size) {
    case "xl":
      return "text-xl";
    case "lg":
      return "text-lg";
    case "sm":
      return "text-sm";
    case "xs":
      return "text-xs";
    default:
      return "";
  }
};

const getVariantClass = (variant?: Variant) => {
  switch (variant) {
    case "danger":
      return "text-red-500";
    default:
      return "";
  }
};

export const Text: FC<TextProps> = ({
  tagName = 'p',
  bold,
  size,
  variant,
  className,
  children,
}) => {
  const Tag = tagName
  return (
    <Tag
      className={[
        bold ? "font-bold" : "",
        getSizeClass(size),
        getVariantClass(variant),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
};
