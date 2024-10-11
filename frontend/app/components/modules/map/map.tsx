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
import { Coordinate } from "~/apiClient/apiSchemas";
import { ToIcon } from "~/components/icon/to";

const GridDistance = 50;
const Size = GridDistance * 100;

const draw = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = colors.gray[100];
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

const SelectorLayer: FC<{
  pinSize?: number;
  pos?: { x: number; y: number };
}> = ({ pinSize = 80, pos }) => {
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
      <ToIcon
        className="absolute mt-[-8px]"
        color={colors.black}
        width={pinSize}
        height={pinSize}
        style={{
          transform: `translateY(-${pinSize / 2}px)`,
        }}
      />
      {pos && (
        <div className="absolute right-6 bottom-4 text-gray-500 font-mono">
          <span>{`${Math.ceil(pos.x)}, ${Math.ceil(pos.y)}`}</span>
        </div>
      )}
    </div>
  );
};

type MapProps = {
  onMove?: (coordinate: Coordinate) => void;
  selectable?: boolean;
};

export const Map: FC<MapProps> = ({ selectable, onMove }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [{ x, y }, setPos] = useState(() => {
    const initialX = -Size / 4;
    const initialY = -Size / 4;
    onMove?.({ latitude: -initialX, longitude: -initialY });
    return { x: initialX, y: initialY };
  });
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
    const setFixedPos = (pageX: number, pageY: number) => {
      const posX = minmax(
        movingStartPos.x - (movingStartPagePos.x - pageX),
        -Size + (outerRect?.width ?? 0),
        0,
      );
      const posY = minmax(
        movingStartPos.y - (movingStartPagePos.y - pageY),
        -Size + (outerRect?.height ?? 0),
        0,
      );
      setPos({
        x: posX,
        y: posY,
      });
      onMove?.({ latitude: -Math.ceil(posX), longitude: -Math.ceil(posY) });
    };
    const onMouseMove = (e: MouseEvent) => {
      setFixedPos(e.pageX, e.pageY);
    };
    const onTouchMove = (e: TouchEvent) => {
      setFixedPos(e.touches[0].pageX, e.touches[0].pageY);
    };
    if (isDrag) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [isDrag, movingStartPagePos, movingStartPos, onMove, outerRect]);

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
      {selectable && <SelectorLayer pos={{ x: -x, y: -y }} />}
    </div>
  );
};
