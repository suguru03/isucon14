import type { FC } from "react";
import { twMerge } from "tailwind-merge";
import { Coordinate } from "~/apiClient/apiSchemas";
import { Button } from "~/components/primitives/button/button";

type LocationButtonProps = {
  position: Coordinate | "here";
  type: "from" | "to";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

export const LocationButton: FC<LocationButtonProps> = ({
  position,
  type,
  disabled,
  className,
  onClick,
}) => {
  const label =
    position === "here"
      ? "現在地"
      : `[${position.latitude}, ${position.longitude}]`;
  return (
    <Button
      disabled={disabled}
      className={twMerge("relative", className)}
      onClick={onClick}
    >
      <span className="absolute left-4 text-xs">
        {type === "from" ? "From" : "To"}
      </span>
      {label}
    </Button>
  );
};
