import LZString from 'lz-string';

/**
 * Compresses the code string to a URL-safe encoded string.
 */
export function compressCode(code: string): string {
    return LZString.compressToEncodedURIComponent(code);
}

/**
 * Decompresses the URL-safe encoded string back to the original code.
 * Returns null if decompression fails.
 */
export function decompressCode(compressed: string): string | null {
    try {
        return LZString.decompressFromEncodedURIComponent(compressed);
    } catch (error) {
        console.error('Failed to decompress code:', error);
        return null;
    }
}
