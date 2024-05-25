import { type FC, useEffect, useRef } from "react";
import { init } from "./scene";
import { resize } from "../../utils";

const Outline: FC = () => {
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

export default Outline;
