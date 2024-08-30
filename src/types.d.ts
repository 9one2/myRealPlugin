declare module '@create-figma/plugin-utilities' {
    export function once(eventName: string, eventHandler: (...args: any[]) => void): void;
    export function showUI(options: { width: number; height: number }): void;
  }

