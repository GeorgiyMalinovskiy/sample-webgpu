import { type FC, useEffect, useRef } from "react";
import { init } from "./scene";

const resize = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;

  const { width = 100, height = 100 } =
    canvas.parentElement?.getBoundingClientRect() ?? {};
  canvas.setAttribute("width", String(width));
  canvas.setAttribute("height", String(height));
};

const SVO: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const onResize = () => resize(canvasRef.current);
    onResize();
    window.addEventListener("resize", onResize);

    if (canvasRef.current) init(canvasRef.current);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <canvas ref={canvasRef} />;
};

export default SVO;
