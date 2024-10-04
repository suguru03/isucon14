import {
  FC,
  PropsWithChildren,
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
} from "react";

type ModalProps = PropsWithChildren<{
  onClose?: () => void; // モーダルが閉じられる際のコールバック
}>;

export const Modal = forwardRef<{ close: () => void }, ModalProps>(
  ({ children, onClose }, ref) => {
    const sheetRef = useRef<HTMLDivElement>(null);

    // モーダルの描画後に位置を設定し、領域外クリックを監視
    useEffect(() => {
      // 領域外クリックでモーダルを閉じる
      const handleOutsideClick = (e: MouseEvent) => {
        if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
          handleClose();
        }
      };

      document.addEventListener("click", handleOutsideClick);

      return () => {
        document.removeEventListener("click", handleOutsideClick);
      };
    }, [onClose]);

    useEffect(() => {
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(0)`; // 初期位置に表示
        }
      }, 50); // アニメーション付きで描画するためのおまじない
    }, []);

    // モーダルを閉じる処理（アニメーションを待つ）
    const handleClose = () => {
      if (sheetRef.current) {
        const modal = sheetRef.current;

        const handleTransitionEnd = () => {
          onClose?.(); // アニメーションが終わってからonCloseを呼び出す
          modal.removeEventListener("transitionend", handleTransitionEnd); // イベントリスナーの解除
        };

        modal.addEventListener("transitionend", handleTransitionEnd); // アニメーションの終了を待つ
        modal.style.transform = `translateY(100%)`; // 画面下に隠す
      }
    };

    // 外部から`handleClose`を呼び出すための関数を提供
    useImperativeHandle(ref, () => ({
      close: handleClose,
    }));

    return (
      <div
        className={
          "fixed bottom-0 left-0 right-0 h-[90vh] bg-white border-t border-l border-r border-gray-300 rounded-t-3xl shadow-lg transition-transform duration-300 ease-in-out"
        }
        ref={sheetRef}
        style={{ willChange: "transform", transform: "translateY(100%)" }}
      >
        <div className="p-4">{children}</div>
      </div>
    );
  },
);
