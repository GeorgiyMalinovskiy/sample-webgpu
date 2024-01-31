import { type FC, type MouseEventHandler } from "react";
import { useNavigate, Outlet } from "react-router-dom";

import { routes } from "./router";

const Root: FC = () => {
  const navigate = useNavigate();

  const handleNavigate: MouseEventHandler = (event) => {
    const element = event.currentTarget as HTMLElement;
    const path = element.dataset.path;
    if (path) navigate(path.toLowerCase());
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <div>
        <ul role="list" className="h-full divide-y divide-gray-400 bg-gray-100">
          {routes.map(({ path }) => {
            return (
              <li
                key={path}
                className="flex justify-between gap-x-6 px-5 py-5 cursor-pointer"
                data-path={path}
                onClick={handleNavigate}
              >
                <div className="flex min-w-0 gap-x-4">
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      {path}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="col-span-2">
        <Outlet />
      </div>
    </div>
  );
};

export default Root;
