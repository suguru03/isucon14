import { FC } from "react";
import { UserIcon } from "~/components/icon/user";

interface AvatarProps {
  size?: "sm";
}

export const Avatar: FC<AvatarProps> = ({ size }) => {
  return (
    <div
      className={`${size === "sm" ? "w-8 h-8" : "w-16 h-16"} border rounded-full bg-gray-400 flex items-center justify-center`}
    >
      <UserIcon />
    </div>
  );
};
