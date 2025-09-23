// Sobrescreve os tipos do Node.js para garantir que o DOM seja usado
type Uint8Array = globalThis.Uint8Array;
type ArrayBuffer = globalThis.ArrayBuffer;
type SharedArrayBuffer = globalThis.SharedArrayBuffer;