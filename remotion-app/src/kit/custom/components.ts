// React components of the custom kinds registered in ./timing.ts (same keys).
import type React from "react";
import { LockdownTitle } from "./LockdownTitle";
import { LoginAlertStack } from "./LoginAlertStack";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customComponents: Record<string, React.FC<any>> = {
  LoginAlertStack,
  LockdownTitle,
};
