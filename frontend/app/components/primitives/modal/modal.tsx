import { FC, PropsWithChildren } from "react";

type ModalProps = PropsWithChildren<{
}>;

export const ButtonLink: FC<ModalProps> = ({ children }) => {
  return (
    <div
      className=""
    >
      {children}
    </div>
  );
};
