import {
  FC,
  MouseEventHandler,
  TouchEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import colors from "tailwindcss/colors";
import { PinIcon } from "~/components/icon/pin";

const GridDistance = 50;
const Size = GridDistance * 100;

const draw = (ctx: CanvasRenderingContext2D) => {
  const grad = ctx.createLinearGradient(0, 0, Size, 0);
  grad.addColorStop(0, colors.white);
  grad.addColorStop(1, colors.gray[100]);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, Size, Size);

  ctx.strokeStyle = colors.gray[200];
  ctx.lineWidth = 10;
  ctx.beginPath();

  for (let v = GridDistance; v < Size; v += GridDistance) {
    ctx.moveTo(v, 0);
    ctx.lineTo(v, Size);
  }

  for (let h = GridDistance; h < Size; h += GridDistance) {
    ctx.moveTo(0, h);
    ctx.lineTo(Size, h);
  }

  ctx.stroke();
};

const minmax = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
};

const SelectorLayer: FC<{ pinSize?: number }> = ({ pinSize = 80 }) => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg
        className="absolute top-0 left-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        opacity={0.1}
      >
        <rect x="50%" y="0" width={2} height={"100%"} />
        <rect x="0" y="50%" width={"100%"} height={2} />
      </svg>
      <PinIcon
        className="absolute mt-[-8px]"
        color={colors.black}
        width={pinSize}
        height={pinSize}
        style={{
          transform: `translateY(-${pinSize / 2}px)`,
        }}
      />
    </div>
  );
};

type MapProps = {
  onMove?: (lat: number, lon: number) => void;
  selectable?: boolean;
};

export const Map: FC<MapProps> = ({ selectable, onMove }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [{ x, y }, setPos] = useState({ x: -Size / 4, y: -Size / 4 });
  const [movingStartPos, setMovingStartPos] = useState({ x: 0, y: 0 });
  const [movingStartPagePos, setMovingStartPagePos] = useState({
    x: 0,
    y: 0,
  });
  const [outerRect, setOuterRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;
    draw(context);
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setOuterRect(entries[0].contentRect);
    });
    if (outerRef.current) {
      observer.observe(outerRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  const onMouseDown: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      setIsDrag(true);
      setMovingStartPagePos({ x: e.pageX, y: e.pageY });
      setMovingStartPos({ x, y });
    },
    [x, y],
  );

  const onTouchStart: TouchEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      setIsDrag(true);
      setMovingStartPagePos({
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
      });
      setMovingStartPos({ x, y });
    },
    [x, y],
  );

  useEffect(() => {
    const onEnd = () => {
      setMovingStartPagePos({ x: 0, y: 0 });
      setIsDrag(false);
    };
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPos({
        x: minmax(
          movingStartPos.x - (movingStartPagePos.x - e.pageX),
          -Size + (outerRect?.width ?? 0),
          0,
        ),
        y: minmax(
          movingStartPos.y - (movingStartPagePos.y - e.pageY),
          -Size + (outerRect?.height ?? 0),
          0,
        ),
      });
    };
    const onTouchMove = (e: TouchEvent) => {
      setPos({
        x: minmax(
          movingStartPos.x - (movingStartPagePos.x - e.touches[0].pageX),
          -Size + (outerRect?.width ?? 0),
          0,
        ),
        y: minmax(
          movingStartPos.y - (movingStartPagePos.y - e.touches[0].pageY),
          -Size + (outerRect?.height ?? 0),
          0,
        ),
      });
    };
    if (isDrag) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [isDrag, movingStartPagePos, movingStartPos, outerRect]);

  useEffect(() => {
    onMove?.(-x, -y);
  }, [onMove, x, y]);

  return (
    <div
      className={twMerge(
        "w-full h-full relative overflow-hidden",
        isDrag && "cursor-grab",
      )}
      ref={outerRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      role="button"
      tabIndex={0}
    >
      <canvas
        width={Size}
        height={Size}
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${x}px, ${y}px)`,
        }}
        ref={canvasRef}
      />
      {!selectable && <SelectorLayer />}
    </div>
  );
};
