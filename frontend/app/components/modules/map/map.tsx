import {
  FC,
  useEffect,
  useCallback,
  useRef,
  useState,
  MouseEventHandler,
  TouchEventHandler,
} from "react";

const size = 5000;

const draw = (ctx: CanvasRenderingContext2D) => {
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, "#f2f2f2");
  grad.addColorStop(1, "#e4e4e4");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 5;
  ctx.beginPath();

  for (let v = 50; v < size; v += 50) {
    ctx.moveTo(v, 0);
    ctx.lineTo(v, size);
  }

  for (let h = 50; h < size; h += 50) {
    ctx.moveTo(0, h);
    ctx.lineTo(size, h);
  }

  ctx.stroke();
};

const minmax = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
};

export const Map: FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [{ x, y }, setPos] = useState({ x: -size / 4, y: -size / 4 });
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
      console.log(entries[0].contentRect);
      setOuterRect(entries[0].contentRect);
    });
    if (outerRef.current) {
      observer.observe(outerRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  const onMouseDown: MouseEventHandler<HTMLCanvasElement> = useCallback(
    (e) => {
      setIsDrag(true);
      setMovingStartPagePos({ x: e.pageX, y: e.pageY });
      setMovingStartPos({ x, y });
    },
    [x, y],
  );

  const onTouchStart: TouchEventHandler<HTMLCanvasElement> = useCallback(
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
          -size + (outerRect?.width ?? 0),
          0,
        ),
        y: minmax(
          movingStartPos.y - (movingStartPagePos.y - e.pageY),
          -size + (outerRect?.height ?? 0),
          0,
        ),
      });
    };
    const onTouchMove = (e: TouchEvent) => {
      setPos({
        x: minmax(
          movingStartPos.x - (movingStartPagePos.x - e.touches[0].pageX),
          -size + (outerRect?.width ?? 0),
          0,
        ),
        y: minmax(
          movingStartPos.y - (movingStartPagePos.y - e.touches[0].pageY),
          -size + (outerRect?.height ?? 0),
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

  return (
    <div className="w-full h-full relative overflow-hidden" ref={outerRef}>
      <canvas
        width={size}
        height={size}
        className="absolute"
        style={{ top: y, left: x }}
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      />
    </div>
  );
};
