import { FC, PropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type TextInputProps = PropsWithoutRef<{
  id: string;
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  onChange?: (v: string) => void;
}>;

export const TextInput: FC<TextInputProps> = (props) => {
  return (
    <>
      <label htmlFor={props.name} className="ps-1 text-gray-500">
        {props.label}
      </label>
      <input
        type="text"
        id={props.id}
        name={props.name}
        value={props.value}
        placeholder={props.placeholder}
        className={twMerge(
          "mt-1 px-5 py-3 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
          props?.className,
        )}
        required={props.required}
        onChange={(e) => props.onChange?.(e.target.value)}
      ></input>
    </>
  );
};
