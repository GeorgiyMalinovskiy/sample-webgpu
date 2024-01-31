import { type ComponentType, createElement } from "react";
import { type RouteObject, createBrowserRouter } from "react-router-dom";

export const routes = Object.entries(
  import.meta.glob("./scenes/**/*.tsx", { import: "default", eager: true }),
).reduce<RouteObject[]>((acc, [url, Component]) => {
  const [path] = url.match(/[a-zA-Z]+(?=\.[a-z]+$)/) ?? [];
  if (path)
    acc.push({ path, element: createElement(Component as ComponentType) });
  return acc;
}, []);

let router: ReturnType<typeof createBrowserRouter>;
export const initRouter = (Root: ComponentType) => {
  if (!router) {
    router = createBrowserRouter([
      {
        path: "/",
        element: createElement(Root),
        children: routes,
      },
    ]);
  }

  return router;
};
