import { type FC, useEffect } from "react";
import { init } from "./scene";

const SVO: FC = () => {
  useEffect(() => {
    init();
  }, []);
  return <>SVO</>;
};

export default SVO;
