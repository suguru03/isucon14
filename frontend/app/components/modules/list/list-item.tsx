import { ComponentProps, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

export function ListItem({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentProps<"li">>) {
  return (
    <li {...props} className={twMerge("border-b", className)}>
      {children}
    </li>
  );
}
