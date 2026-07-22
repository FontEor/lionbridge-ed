/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Popover from "@/components/Popover";
import clsx from "clsx";
import { type PositionTypes } from "@/utils/CalculatePosition";

export interface TooltipProps {
  children?: React.ReactNode;
  content?: React.ReactNode;
  position?: PositionTypes;
  [key: string]: any;
}

const Tooltip = ({
  children,
  className,
  position = "bottom",
  ...rest
}: TooltipProps) => {
  return (
    <Popover
      showClose={false}
      className={clsx("ems-small", className)}
      position={position}
      {...rest}
    >
      {children}
    </Popover>
  );
};

export default Tooltip;
