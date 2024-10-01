import { FC } from "react";

interface AvatarProps {
  size?: "sm";
}

export const Avatar: FC<AvatarProps> = ({ size }) => {
  return (
    <div
      className={`${size === "sm" ? "w-8 h-8" : "w-16 h-16"} border rounded-full bg-gray-400`}
    />
  );
};
