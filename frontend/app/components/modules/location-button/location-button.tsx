import type { FC } from "react";
import { twMerge } from "tailwind-merge";
import { Coordinate } from "~/apiClient/apiSchemas";
import { Button } from "~/components/primitives/button/button";

type LocationButtonProps = {
  location?: Coordinate;
  label?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  onClick?: () => void;
};

export const LocationButton: FC<LocationButtonProps> = ({
  location: position,
  label,
  disabled,
  className,
  onClick,
  placeholder = "場所を選択する",
}) => {
  return (
    <Button
      disabled={disabled}
      className={twMerge("relative", className)}
      onClick={onClick}
    >
      {label && (
        <span className="absolute left-4 text-xs text-neutral-500 font-mono">
          {label}
        </span>
      )}
      {position ? (
        <span className="font-mono">
          {`[${position.latitude}, ${position.longitude}]`}
        </span>
      ) : (
        <span>{placeholder}</span>
      )}
    </Button>
  );
};
