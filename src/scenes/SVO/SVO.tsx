import { type FC, useEffect, useRef } from "react";
import { init } from "./scene";

const SVO: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      const { width = 100, height = 100 } =
        canvasRef.current.parentElement?.getBoundingClientRect() ?? {};
      canvasRef.current.setAttribute("width", String(width));
      canvasRef.current.setAttribute("height", String(height));

      init(canvasRef.current);
    }
  }, []);

  return <canvas ref={canvasRef} />;
};

export default SVO;
