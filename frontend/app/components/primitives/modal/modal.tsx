import {
  ComponentProps,
  PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { twMerge } from "tailwind-merge";

type ModalProps = PropsWithChildren<
  ComponentProps<"div"> & {
    onClose?: () => void;
  }
>;

export const Modal = forwardRef<{ close: () => void }, ModalProps>(
  ({ children, onClose, className, ...props }, ref) => {
    const sheetRef = useRef<HTMLDivElement>(null);

    const handleClose = () => {
      if (sheetRef.current) {
        const modal = sheetRef.current;

        const handleTransitionEnd = () => {
          onClose?.();
          modal.removeEventListener("transitionend", handleTransitionEnd);
        };

        modal.addEventListener("transitionend", handleTransitionEnd);
        modal.style.transform = `translateY(100%)`;
      }
    };

    useEffect(() => {
      const timer = setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(0)`;
        }
      }, 50);
      return () => clearTimeout(timer);
    }, []);

    useImperativeHandle(ref, () => ({
      close: handleClose,
    }));

    return (
      <>
        <div className="fixed inset-0 bg-black opacity-50 z-40"></div>
        <div
          className={twMerge(
            "fixed bottom-0 left-0 right-0 h-[90vh] bg-white rounded-t-3xl shadow-lg transition-transform duration-300 ease-in-out z-50 md:max-w-screen-md mx-auto",
            className,
          )}
          ref={sheetRef}
          style={{ willChange: "transform", transform: "translateY(100%)" }}
          {...props}
        >
          <div className="px-8 py-6 h-full">{children}</div>
        </div>
      </>
    );
  },
);

Modal.displayName = "Modal";
