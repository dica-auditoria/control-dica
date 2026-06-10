const SAMPLE_THRESHOLD = 500 * 1024 * 1024; // 500 MB
const SAMPLE_SIZE = 32 * 1024 * 1024;        // 32 MB del inicio + 32 MB del final

// Para archivos > 500 MB: muestra inicio+final para evitar cargar todo en RAM.
// No es un hash criptográfico completo, pero es suficiente para detectar duplicados en UI.
export async function calcularSHA256(file: File): Promise<string> {
  let buffer: ArrayBuffer;

  if (file.size > SAMPLE_THRESHOLD) {
    const head = await file.slice(0, SAMPLE_SIZE).arrayBuffer();
    const tail = await file.slice(file.size - SAMPLE_SIZE).arrayBuffer();
    const combined = new Uint8Array(head.byteLength + tail.byteLength);
    combined.set(new Uint8Array(head), 0);
    combined.set(new Uint8Array(tail), head.byteLength);
    buffer = combined.buffer;
  } else {
    buffer = await file.arrayBuffer();
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function formatHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}
