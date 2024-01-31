import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@fontsource-variable/inter";

import "./index.css";
import Root from "./Root.tsx";
import { initRouter } from "./router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={initRouter(Root)} />
  </StrictMode>,
);
