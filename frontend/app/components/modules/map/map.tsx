import {
  FC,
  MouseEventHandler,
  TouchEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import colors from "tailwindcss/colors";
import { ToIcon } from "~/components/icon/to";
import type { Coordinate, Pos } from "~/types";

const GridDistance = 50;
const MapSize = GridDistance * 100;
const PinSize = 40;

const draw = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = colors.gray[100];
  ctx.fillRect(0, 0, MapSize, MapSize);

  ctx.strokeStyle = colors.gray[200];
  ctx.lineWidth = 10;
  ctx.beginPath();

  for (let v = GridDistance; v < MapSize; v += GridDistance) {
    ctx.moveTo(v, 0);
    ctx.lineTo(v, MapSize);
  }

  for (let h = GridDistance; h < MapSize; h += GridDistance) {
    ctx.moveTo(0, h);
    ctx.lineTo(MapSize, h);
  }

  ctx.stroke();
};

const minmax = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
};

const coordinateToPos = (coordinate: Coordinate): Pos => {
  return {
    x: -coordinate.latitude,
    y: -coordinate.longitude,
  };
};

const posToCoordinate = (pos: Pos): Coordinate => {
  return {
    latitude: Math.ceil(-pos.x),
    longitude: Math.ceil(-pos.y),
  };
};

const centerPosFrom = (pos: Pos, outerRect: DOMRect): Pos => {
  return {
    x: pos.x - outerRect.width / 2,
    y: pos.y - outerRect.height / 2,
  };
};

const SelectorLayer: FC<{
  pinSize?: number;
  pos?: Pos;
}> = ({ pinSize = 80, pos }) => {
  const loc = useMemo(() => pos && posToCoordinate(pos), [pos]);
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
        className="absolute mt-[-8px] opacity-60"
        color={colors.black}
        width={pinSize}
        height={pinSize}
        style={{
          transform: `translateY(-${pinSize / 2}px)`,
        }}
      />
      {loc && (
        <div className="absolute right-6 bottom-4 text-gray-500 font-mono">
          <span>{`${loc.latitude}, ${loc.longitude}`}</span>
        </div>
      )}
    </div>
  );
};

const PinLayer: FC<{ from?: Coordinate; to?: Coordinate }> = ({ from, to }) => {
  const fromPos = useMemo(() => from && coordinateToPos(from), [from]);
  const toPos = useMemo(() => to && coordinateToPos(to), [to]);
  return (
    <div className="flex w-full h-full absolute top-0 left-0">
      {fromPos && (
        <ToIcon
          className="absolute top-0 left-0"
          color={colors.black}
          width={PinSize}
          height={PinSize}
          style={{
            transform: `translate(${-fromPos.x - PinSize / 2}px, ${-fromPos.y - PinSize}px)`,
          }}
        />
      )}
      {toPos && (
        <ToIcon
          className="absolute"
          color={colors.red[500]}
          width={PinSize}
          height={PinSize}
          style={{
            transform: `translate(${-toPos.x - PinSize / 2}px, ${-toPos.y - PinSize}px)`,
          }}
        ></ToIcon>
      )}
    </div>
  );
};

type MapProps = {
  onMove?: (coordinate: Coordinate) => void;
  selectable?: boolean;
  from?: Coordinate;
  to?: Coordinate;
};

export const Map: FC<MapProps> = ({ selectable, onMove, from, to }) => {
  const onMoveRef = useRef(onMove);
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [{ x, y }, setPos] = useState({
    x: -MapSize / 4,
    y: -MapSize / 4,
  });
  const [movingStartPos, setMovingStartPos] = useState({ x: 0, y: 0 });
  const [movingStartPagePos, setMovingStartPagePos] = useState({
    x: 0,
    y: 0,
  });
  const [outerRect, setOuterRect] = useState<DOMRect | undefined>(() =>
    outerRef.current?.getBoundingClientRect(),
  );

  useEffect(() => {
    if (outerRect)
      onMoveRef?.current?.(posToCoordinate(centerPosFrom({ x, y }, outerRect)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outerRect]);

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
      if (!outerRect) return;
      const posX = minmax(
        movingStartPos.x - (movingStartPagePos.x - pageX),
        -MapSize + outerRect.width,
        0,
      );
      const posY = minmax(
        movingStartPos.y - (movingStartPagePos.y - pageY),
        -MapSize + outerRect.height,
        0,
      );
      setPos({ x: posX, y: posY });
      onMoveRef?.current?.(
        posToCoordinate(centerPosFrom({ x: posX, y: posY }, outerRect)),
      );
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
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${x}px, ${y}px)`,
          width: MapSize,
          height: MapSize,
        }}
      >
        <canvas width={MapSize} height={MapSize} ref={canvasRef} />
        <PinLayer from={from} to={to} />
      </div>
      {selectable && outerRect && (
        <SelectorLayer pos={centerPosFrom({ x, y }, outerRect)} />
      )}
    </div>
  );
};
