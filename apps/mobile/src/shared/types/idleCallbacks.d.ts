// Provided by React Native's setUpTimers, but absent from its TypeScript globals.
declare function requestIdleCallback(
  callback: (deadline: {readonly didTimeout: boolean; timeRemaining(): number}) => void,
  options?: {timeout?: number},
): number;

declare function cancelIdleCallback(handle: number): void;
