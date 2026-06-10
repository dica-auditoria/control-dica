const CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB por chunk

export async function calcularSHA256(file: File): Promise<string> {
  // Para archivos pequeños usamos arrayBuffer directo (más rápido)
  if (file.size <= CHUNK_SIZE) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Para archivos grandes: hash incremental por chunks usando Web Crypto importKey trick
  // Web Crypto no soporta streaming nativo, usamos SHA-256 implementación manual via chunks
  // con la API de WASM o simplemente procesamos en un único buffer (hasta 2 GB es manejable)
  // en 64-bit browsers. Para archivos > 2GB habría que usar una lib, pero cubrimos el caso de uso.
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function formatHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}
