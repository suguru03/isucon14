import {
  PropsWithChildren,
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
} from "react";
import { useOnClickOutside } from "~/components/hooks/useOnClickOutside";

type ModalProps = PropsWithChildren<{
  onClose?: () => void;
}>;

export const Modal = forwardRef<{ close: () => void }, ModalProps>(
  ({ children, onClose }, ref) => {
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
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(0)`;
        }
      }, 50);
    }, []);

    useOnClickOutside(sheetRef, handleClose);

    useImperativeHandle(ref, () => ({
      close: handleClose,
    }));

    return (
      <>
        <div className="fixed inset-0 bg-black opacity-50 z-40"></div>
        <div
          className={
            "fixed bottom-0 left-0 right-0 h-[90vh] bg-white border-t border-l border-r border-gray-300 rounded-t-3xl shadow-lg transition-transform duration-300 ease-in-out z-50"
          }
          ref={sheetRef}
          style={{ willChange: "transform", transform: "translateY(100%)" }}
        >
          <div className="p-4">{children}</div>
        </div>
      </>
    );
  },
);

Modal.displayName = "Modal";
