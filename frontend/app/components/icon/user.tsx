import type { ComponentProps, FC } from "react";

export const UserIcon: FC<ComponentProps<"svg">> = function (props) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      {...props}
    >
      {/* 仮 */}
      <path d="M8 0 L16 14 L0 14 Z" />
    </svg>
  );
};
