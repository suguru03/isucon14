import type { PropsWithChildren, FC } from "react";

export const MainFrame: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="md:max-w-screen-md relative ml-auto mr-auto shadow-xl">
      <div className="flex flex-col h-screen w-full relative bg-white">
        {children}
      </div>
    </div>
  );
};
