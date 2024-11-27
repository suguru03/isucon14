import { FC, PropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type DateInputProps = PropsWithoutRef<{
  id: string;
  name: string;
  label?: string;
  defaultValue?: string;
  className?: string;
  required?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}>;

export const DateInput: FC<DateInputProps> = (props) => {
  return (
    <>
      {props.label ? (
        <label htmlFor={props.name} className="ps-1 text-gray-500">
          {props.label}
        </label>
      ) : null}
      <input
        type="date"
        id={props.id}
        name={props.name}
        defaultValue={props.defaultValue}
        className={twMerge(
          "mt-1 px-5 py-3 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
          props?.className,
        )}
        required={props.required}
        onChange={props.onChange}
      ></input>
    </>
  );
};
