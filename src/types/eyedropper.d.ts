// Tipos para la EyeDropper API (Chromium), ausente en lib.dom.d.ts.
// El uso siempre va precedido de un guard runtime `'EyeDropper' in window`.
export {}

declare global {
  interface EyeDropperOpenOptions {
    signal?: AbortSignal
  }

  interface EyeDropperResult {
    sRGBHex: string
  }

  interface EyeDropper {
    open(options?: EyeDropperOpenOptions): Promise<EyeDropperResult>
  }

  interface Window {
    EyeDropper: { new (): EyeDropper }
  }
}
