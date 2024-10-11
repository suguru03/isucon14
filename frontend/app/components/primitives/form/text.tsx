import { FC, PropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type TextInputProps = PropsWithoutRef<{
  id: string;
  name: string;
  label: string;
  className?: string;
  required?: boolean;
}>;

export const TextInput: FC<TextInputProps> = (props) => {
  return (
    <>
      <label htmlFor={props.name}>{props.label}</label>
      <input
        type="text"
        id={props.id}
        name={props.name}
        className={twMerge(
          "mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
          props?.className,
        )}
        required={props.required}
      ></input>
    </>
  );
};
