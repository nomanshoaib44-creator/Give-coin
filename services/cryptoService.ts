import type { Transaction } from "../types";

// FOR BLOCKS
export const calculateBlockHash = async (
  index: number,
  timestamp: number,
  transactions: Transaction[],
  previousHash: string,
  nonce: number
): Promise<string> => {
  const input = `${index}${timestamp}${JSON.stringify(transactions)}${previousHash}${nonce}`;
  return await sha256(input);
};

// FOR TRANSACTIONS
export const calculateTransactionHash = (tx: Transaction): string => {
    // Signature must not be part of the hash
    const { signature, ...txData } = tx;
    return JSON.stringify(txData);
};

// --- HASHING ---
export const sha256 = async (input: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- KEY MANAGEMENT ---
// Fix: Corrected the Web Crypto API type for ECDSA key generation.
const KEY_PARAMS: EcKeyGenParams = {
    name: "ECDSA",
    namedCurve: "P-256",
};

export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
    return await crypto.subtle.generateKey(KEY_PARAMS, true, ["sign", "verify"]);
};

export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
    const exported = await crypto.subtle.exportKey("spki", key);
    return bufferToBase64(exported);
};

export const exportPrivateKey = async (key: CryptoKey): Promise<string> => {
    const exported = await crypto.subtle.exportKey("pkcs8", key);
    return bufferToBase64(exported);
};

export const importPrivateKey = async (pkcs8: string): Promise<CryptoKey> => {
    const buffer = base64ToBuffer(pkcs8);
    return await crypto.subtle.importKey(
        "pkcs8",
        buffer,
        KEY_PARAMS,
        true,
        ["sign"]
    );
};


// --- SIGNING & VERIFICATION ---
const SIGN_ALGORITHM: EcdsaParams = {
    name: "ECDSA",
    hash: { name: "SHA-256" },
};

export const sign = async (privateKey: CryptoKey, data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const signatureBuffer = await crypto.subtle.sign(SIGN_ALGORITHM, privateKey, encodedData);
    return bufferToBase64(signatureBuffer);
};

export const verify = async (publicKey: string, signature: string, data: string): Promise<boolean> => {
    try {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);
        
        const publicKeyBuffer = base64ToBuffer(publicKey);
        const importedPublicKey = await crypto.subtle.importKey(
            "spki",
            publicKeyBuffer,
            KEY_PARAMS,
            true,
            ["verify"]
        );

        const signatureBuffer = base64ToBuffer(signature);
        return await crypto.subtle.verify(SIGN_ALGORITHM, importedPublicKey, signatureBuffer, encodedData);
    } catch (e) {
        console.error("Verification failed", e);
        return false;
    }
};

// --- HELPERS ---
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};