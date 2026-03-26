// Deno runtime type stubs for VS Code IntelliSense
// These are only for editor support — actual types come from Deno runtime

declare namespace Deno {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
  export const env: {
    get(key: string): string | undefined;
  };
}
