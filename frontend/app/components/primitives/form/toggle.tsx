import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type Props = Omit<
  ComponentProps<"input">,
  "type" | "name" | "value" | "onChange"
> & {
  value: boolean;
  onUpdate: (v: boolean) => void;
};

export function Toggle(props: Props) {
  const { value, onUpdate, className, ...rest } = props;
  return (
    <label
      className={twMerge(
        // Base
        "w-[70px] h-[38px] p-[3px]",
        "bg-slate-200 rounded-full",
        "block relative",
        // Switch
        "after:w-[32px] after:h-[32px]",
        "after:rounded-full",
        "after:absolute after:top-[3px]",
        "after:transition-transform",
        value
          ? "after:bg-green-500 after:translate-x-full"
          : "after:bg-slate-50 after:left-[3px]",
        className,
      )}
    >
      <input
        className="hidden"
        {...rest}
        type="checkbox"
        value={`${value}`}
        onChange={() => onUpdate(!value)}
      />
    </label>
  );
}
