import type { ComponentProps, FC } from "react";
import { twMerge } from "tailwind-merge";
import { UserIcon } from "~/components/icon/user";

type Size = "sm" | "md" | "lg";

type AvatarProps = ComponentProps<"div"> & {
  size?: Size;
};

const getSizeClass = (size: Size) => {
  switch (size) {
    case "sm":
      return "size-10";
    case "md":
      return "size-16";
    case "lg":
      return "size-24";
  }
};

export const Avatar: FC<AvatarProps> = ({
  size = "md",
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        "border rounded-full bg-gray-400 flex items-center justify-center",
        getSizeClass(size),
        className,
      )}
      {...props}
    >
      <UserIcon />
    </div>
  );
};
