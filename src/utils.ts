export const resize = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;

  const { width = 100, height = 100 } =
    canvas.parentElement?.getBoundingClientRect() ?? {};
  canvas.setAttribute("width", String(width));
  canvas.setAttribute("height", String(height));
};
