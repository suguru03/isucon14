import { FC, PropsWithChildren, useState, useRef, useEffect } from "react";

type ModalProps = PropsWithChildren<{}>;

export const Modal: FC<ModalProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // 描画制御用
  const [isDragging, setIsDragging] = useState(false); // ドラッグ中かどうかを管理
  const sheetRef = useRef<HTMLDivElement>(null); // ボトムシートの参照
  const animationFrameRef = useRef<number | null>(null); // requestAnimationFrame用の参照
  const currentYRef = useRef<number>(0); // 現在のY座標を保存
  const startYRef = useRef<number>(0); // ドラッグ開始位置
  const initialPositionRef = useRef<number>(0); // 初期のY位置を保持するための参照

  // テキスト選択を無効にする関数 (Safari対応)
  const disableTextSelection = () => {
    document.addEventListener("selectstart", preventTextSelection); // selectstart イベントを無効化
  };

  // テキスト選択を有効に戻す関数 (Safari対応)
  const enableTextSelection = () => {
    document.removeEventListener("selectstart", preventTextSelection); // selectstart イベントを解除
  };

  // テキスト選択を無効化するための関数
  const preventTextSelection = (e: Event) => {
    e.preventDefault();
  };

  // isOpen が true になったときに isVisible を true にして描画開始
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => {
        if (sheetRef.current) {
          const sheetHeight = sheetRef.current.getBoundingClientRect().height * 10 / 9; // 実際の高さを取得
          initialPositionRef.current = window.innerHeight - sheetHeight; // 初期位置は画面の高さ - ボトムシートの高さ
          sheetRef.current.style.transform = `translateY(${initialPositionRef.current}px)`; // 初期位置に表示
        }
      }, 50);

      // 領域外クリックでモーダルを閉じるイベントを追加
      const handleOutsideClick = (e: MouseEvent) => {
        if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleOutsideClick);

      return () => {
        document.removeEventListener("mousedown", handleOutsideClick);
      };
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transform = "translateY(100%)";
      }
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
      }, 300); // アニメーションが完了した後に非表示
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const toggleSheet = () => {
    setIsOpen(!isOpen);
  };

  // タッチ開始 & マウスダウンイベント
  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY; // タッチ or マウス位置取得
    startYRef.current = clientY; // 開始位置を保存
    currentYRef.current = 0; // 現在のY位置をリセット
    setIsDragging(true); // ドラッグ開始をフラグで管理
    disableTextSelection(); // ドラッグ中にテキスト選択を無効化
  };

  // タッチ移動 & マウスムーブイベント
  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return; // ドラッグ中でなければ何もしない

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY; // タッチ or マウス位置取得
    let diffY = clientY - startYRef.current;

    // ボトムシートが初期位置（refで取得した初期位置）より上に移動しないようにする
    if (diffY < -initialPositionRef.current) {
      diffY = -initialPositionRef.current;
    }

    currentYRef.current = diffY;

    if (sheetRef.current) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
        sheetRef.current!.style.transform = `translateY(${diffY}px)`;
      });
    }
  };

  // タッチ終了 & マウスアップイベント
  const handleEnd = () => {
    if (!isDragging) return; // ドラッグ中でなければ何もしない
    setIsDragging(false); // ドラッグ終了
    enableTextSelection(); // ドラッグ終了後にテキスト選択を有効化

    const sheetElement = sheetRef.current;
    if (sheetElement) {
      const movedDistance = currentYRef.current; // 最終的な移動距離
      const threshold = window.innerHeight * 0.5; // 50%のしきい値

      // 終了時にのみ threshold を超えているか判断し、動作を決定
      if (movedDistance > threshold) {
        sheetElement.style.transform = "translateY(100%)"; // 完全に画面下までスライド
        setTimeout(() => setIsOpen(false), 300); // アニメーション後に閉じる
      } else {
        sheetElement.style.transform = `translateY(${initialPositionRef.current}px)`; // 初期位置に戻す
      }
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  return (
    <>
      <button
        className="bg-blue-500 text-white py-2 px-4 rounded"
        onClick={toggleSheet}
      >
        {isOpen ? "Close" : "Open"} Bottom Sheet
      </button>

      {isVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 h-[90vh] bg-white border-t border-l border-r border-gray-300 rounded-t-3xl shadow-lg transition-transform duration-300 ease-in-out"
          ref={sheetRef}
          style={{ willChange: "transform", transform: "translateY(100%)" }} // 初期は画面下に隠れている
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
        >
          <div className="p-4">
            <h2 className="text-xl font-bold">スワイプまたはドラッグで閉じるボトムシート</h2>
            <p>画面の下から90%の位置まで表示します。</p>
            {children}
          </div>
        </div>
      )}
    </>
  );
};

