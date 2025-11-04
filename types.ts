export interface Wallet {
    publicKey: string;
    privateKey: string;
}

export interface Balances {
    shdw: number;
    shdwg: number;
}

// Fix: Add Transaction interface for use in services and components.
export interface Transaction {
    fromAddress: string | null;
    toAddress: string;
    amount: number;
    fee?: number;
    timestamp: number;
    signature?: string;
}

// Fix: Add Block interface for use in services and components.
export interface Block {
    index: number;
    timestamp: number;
    transactions: Transaction[];
    previousHash: string;
    hash: string;
    nonce: number;
    isValid: boolean;
}
