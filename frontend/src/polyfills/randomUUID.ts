function fallbackRandomUUID(): string {
    const cryptoApi = globalThis.crypto;

    // Preferred fallback: cryptographically secure random bytes.
    if (typeof cryptoApi?.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        cryptoApi.getRandomValues(bytes);

        // UUID v4 bits.
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = Array.from(bytes, (byte) =>
            byte.toString(16).padStart(2, "0")
        ).join("");

        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20),
        ].join("-");
    }

    // Last fallback for very old browsers.
    // Fine for UI IDs, not suitable for passwords/session tokens/etc.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        const value = char === "x"
            ? random
            : (random & 0x03) | 0x08;

        return value.toString(16);
    });
}

const cryptoApi = globalThis.crypto;

// On HTTPS and localhost, randomUUID normally already exists.
// On public HTTP, it may be absent.
if (cryptoApi && typeof cryptoApi.randomUUID !== "function") {
    try {
        Object.defineProperty(cryptoApi, "randomUUID", {
            value: fallbackRandomUUID,
            configurable: true,
            writable: true,
        });
    } catch {
        // Fallback if the browser does not allow defineProperty.
        try {
            (cryptoApi as any).randomUUID = fallbackRandomUUID;
        } catch {
            console.warn("Could not polyfill crypto.randomUUID");
        }
    }
}