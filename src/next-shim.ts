
/// <reference types="react" />
/// <reference types="react-dom" />

// This file provides compatibility shims for Next.js-specific types and globals
// that might be referenced in components but aren't available in a Vite environment

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
