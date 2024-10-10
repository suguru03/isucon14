import { FC } from "react";
import { UserIcon } from "~/components/icon/user";

type Size = "sm" | "md" | "lg";

interface AvatarProps {
  size?: Size;
}

const getSizeClass = (size: Size = "md") => {
  switch (size) {
    case "sm":
      return "size-8";
    case "md":
      return "size-16";
    case "lg":
      return "size-24";
  }
};

export const Avatar: FC<AvatarProps> = ({ size }) => {
  return (
    <div
      className={`border rounded-full bg-gray-400 flex items-center justify-center ${getSizeClass(size)}`}
    >
      <UserIcon />
    </div>
  );
};
