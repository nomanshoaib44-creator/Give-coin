import { useState, useEffect, useCallback, useMemo } from 'react';
import { P2PService, P2PMessage } from '../services/p2pService';
import { sha256, generateKeyPair, exportPublicKey, exportPrivateKey, sign, importPrivateKey, calculateTransactionHash, verify } from '../services/cryptoService';
import type { Wallet, Block, Transaction } from '../types';

// --- Blockchain Constants ---
const BLOCK_TIME_MS = 10 * 60 * 1000; // 10 minutes
const FOUR_YEARS_IN_MS = 4 * 365.25 * 24 * 60 * 60 * 1000;
const P2P_LOCK_MS = 2 * 365.25 * 24 * 60 * 60 * 1000; // 2 years
const INITIAL_REWARD = 50;
const TOTAL_SUPPLY_CAP = 100_000_000;
const FIRST_USER_GRANT = 50_000_000;

// --- LocalStorage Keys ---
const LS_CHAIN = 'shadowCoinChain';
const LS_PENDING_TRANSACTIONS = 'shadowCoinPendingTx';
const LS_CREATION_DATE = 'shadowCoinCreationDate';
const LS_USERS = 'shadowCoinUsers';
const LS_WALLET_PREFIX = 'shadowCoinWallet_';

// --- Blockchain Class ---
// FIX: Export Blockchain class to be used in other components.
export class Blockchain {
    chain: Block[];
    pendingTransactions: Transaction[];
    difficulty: number;
    
    constructor(chain: Block[], pendingTransactions: Transaction[]) {
        this.chain = chain;
        this.pendingTransactions = pendingTransactions;
        this.difficulty = 2; // Simple difficulty
    }

    getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    async addBlock(block: Block): Promise<void> {
        block.previousHash = this.getLatestBlock().hash;
        block.hash = await this.calculateHashForBlock(block);
        
        // Basic PoW simulation
        while (block.hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join("0")) {
            block.nonce++;
            block.hash = await this.calculateHashForBlock(block);
        }

        block.isValid = true; // Assume valid after "mining"
        this.chain.push(block);
    }
    
    async calculateHashForBlock(block: Block): Promise<string> {
        return sha256(block.index + block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce);
    }

    getBalanceOfAddress(address: string): number {
        let balance = 0;
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                    if(trans.fee) balance -= trans.fee;
                }
                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }
        return balance;
    }

    getTotalSupply(): number {
       let mined = 0;
       this.chain.forEach(block => {
           block.transactions.forEach(tx => {
               if (tx.fromAddress === null) { // Reward transaction
                   mined += tx.amount;
               }
           })
       });
       return mined;
    }
}

// --- Hook Implementation ---
export const useBlockchain = (userEmail: string) => {
    const [blockchain, setBlockchain] = useState<Blockchain | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [latestBlock, setLatestBlock] = useState<Block | null>(null);
    
    const p2pService = useMemo(() => new P2PService(), []);
    
    const calculateCurrentReward = useCallback((creationDate: number): number => {
        const timeSinceCreation = Date.now() - creationDate;
        const halvings = Math.floor(timeSinceCreation / FOUR_YEARS_IN_MS);
        return INITIAL_REWARD / Math.pow(2, halvings);
    }, []);
    
    const formatTimeLeft = (ms: number): string => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const years = Math.floor(totalSeconds / (365 * 24 * 3600));
        const days = Math.floor((totalSeconds % (365 * 24 * 3600)) / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (years > 0) return `${years}y ${days}d ${String(hours).padStart(2, '0')}h`;
        return `${String(days).padStart(2,'0')}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const [p2pStatus, setP2pStatus] = useState({ isP2PEnabled: false, timeUntilP2P: '...' });

    // Initialization
    useEffect(() => {
        const init = async () => {
            // 1. Wallet
            const walletKey = `${LS_WALLET_PREFIX}${userEmail}`;
            let currentWallet: Wallet;
            const savedWallet = localStorage.getItem(walletKey);
            if (savedWallet) {
                currentWallet = JSON.parse(savedWallet);
            } else {
                const keyPair = await generateKeyPair();
                const publicKey = await exportPublicKey(keyPair.publicKey);
                const privateKey = await exportPrivateKey(keyPair.privateKey);
                currentWallet = { publicKey, privateKey };
                localStorage.setItem(walletKey, JSON.stringify(currentWallet));
            }
            setWallet(currentWallet);

            // 2. Blockchain
            let chainData = JSON.parse(localStorage.getItem(LS_CHAIN) || '[]');
            let pendingTxData = JSON.parse(localStorage.getItem(LS_PENDING_TRANSACTIONS) || '[]');
            let creationDate = parseInt(localStorage.getItem(LS_CREATION_DATE) || '0', 10);
            let users = JSON.parse(localStorage.getItem(LS_USERS) || '[]');

            if (chainData.length === 0) { // First time ever running the app
                creationDate = Date.now();
                localStorage.setItem(LS_CREATION_DATE, creationDate.toString());

                // First user gets the grant
                const firstUserRewardTx: Transaction = {
                    fromAddress: null,
                    toAddress: currentWallet.publicKey,
                    amount: FIRST_USER_GRANT,
                    timestamp: Date.now()
                };

                const genesisBlock: Block = {
                    index: 0,
                    timestamp: Date.now(),
                    transactions: [firstUserRewardTx],
                    previousHash: "0",
                    hash: "",
                    nonce: 0,
                    isValid: true
                };
                genesisBlock.hash = await sha256(JSON.stringify(genesisBlock));
                chainData = [genesisBlock];
                users = [userEmail];
                localStorage.setItem(LS_USERS, JSON.stringify(users));
            } else {
                // Not the first user ever, but maybe new to this instance
                if (!users.includes(userEmail)) {
                    users.push(userEmail);
                    localStorage.setItem(LS_USERS, JSON.stringify(users));
                }
            }

            const bc = new Blockchain(chainData, pendingTxData);
            setBlockchain(bc);
            setLatestBlock(bc.getLatestBlock());
            setIsInitialized(true);
        };
        init();
    }, [userEmail]);
    
    // Life-Mining and P2P Countdown Loop
    useEffect(() => {
        if (!isInitialized || !blockchain || !wallet) return;

        // FIX: Declare mineInterval in a scope accessible to both mineAndSync and the cleanup function.
        let mineInterval: ReturnType<typeof setInterval>;
        const creationDate = parseInt(localStorage.getItem(LS_CREATION_DATE) || '0', 10);

        const mineAndSync = async () => {
            const reward = calculateCurrentReward(creationDate);
            const totalSupply = blockchain.getTotalSupply();
            if (totalSupply >= TOTAL_SUPPLY_CAP) {
                console.log("Total supply reached. Mining stopped.");
                // FIX: Clear the interval when supply cap is reached.
                if(mineInterval) clearInterval(mineInterval);
                return;
            }

            const rewardTx: Transaction = {
                fromAddress: null,
                toAddress: wallet.publicKey,
                amount: reward,
                timestamp: Date.now()
            };
            
            const newBlock: Block = {
                index: blockchain.getLatestBlock().index + 1,
                timestamp: Date.now(),
                transactions: [rewardTx, ...blockchain.pendingTransactions],
                previousHash: blockchain.getLatestBlock().hash,
                hash: "",
                nonce: 0,
                isValid: false,
            };

            await blockchain.addBlock(newBlock);
            blockchain.pendingTransactions = [];
            
            setBlockchain(new Blockchain([...blockchain.chain], []));
            setLatestBlock(newBlock);
            localStorage.setItem(LS_CHAIN, JSON.stringify(blockchain.chain));
            localStorage.setItem(LS_PENDING_TRANSACTIONS, JSON.stringify([]));
            p2pService.broadcastChain(blockchain.chain);
        };
        
        const updateP2PStatus = () => {
             const timeSinceCreation = Date.now() - creationDate;
             if (timeSinceCreation >= P2P_LOCK_MS) {
                 setP2pStatus({ isP2PEnabled: true, timeUntilP2P: '0d 00:00:00' });
             } else {
                 const timeLeft = P2P_LOCK_MS - timeSinceCreation;
                 setP2pStatus({ isP2PEnabled: false, timeUntilP2P: formatTimeLeft(timeLeft) });
             }
        };

        const timeSinceCreation = Date.now() - creationDate;
        const timeIntoCurrentInterval = timeSinceCreation % BLOCK_TIME_MS;
        const timeUntilNextBlock = BLOCK_TIME_MS - timeIntoCurrentInterval;

        const mineTimeout = setTimeout(() => {
            mineAndSync();
            // After the first one, subsequent blocks are every BLOCK_TIME_MS
            mineInterval = setInterval(mineAndSync, BLOCK_TIME_MS);
        }, timeUntilNextBlock);
        
        const p2pInterval = setInterval(updateP2PStatus, 1000);
        updateP2PStatus(); // Initial call

        return () => {
            clearTimeout(mineTimeout);
            clearInterval(p2pInterval);
            // FIX: Ensure the mining interval is also cleared on cleanup.
            if (mineInterval) clearInterval(mineInterval);
        };

    }, [isInitialized, blockchain, wallet, calculateCurrentReward, p2pService]);
    
    // P2P Message Handling
    useEffect(() => {
        if (!isInitialized || !p2pService || !wallet) return;

        const handleMessage = async (message: P2PMessage) => {
            if (message.type === 'TRANSACTION_BROADCAST') {
                const receivedTx = message.payload;
                
                if (!receivedTx.fromAddress || !receivedTx.signature) {
                    console.warn("Received transaction without sender or signature.", receivedTx);
                    return;
                }
                if (receivedTx.fromAddress === wallet.publicKey) {
                    return; // Ignore own transactions
                }

                const dataToVerify = calculateTransactionHash(receivedTx);
                const isSignatureValid = await verify(receivedTx.fromAddress, receivedTx.signature, dataToVerify);
                
                if (!isSignatureValid) {
                    console.warn("Received transaction with invalid signature.", receivedTx);
                    return;
                }
                
                setBlockchain(prevBlockchain => {
                    if (!prevBlockchain) return null;
                    const isAlreadyPending = prevBlockchain.pendingTransactions.some(tx => tx.signature === receivedTx.signature);
                    if (isAlreadyPending) return prevBlockchain;

                    const newPendingTxs = [...prevBlockchain.pendingTransactions, receivedTx];
                    localStorage.setItem(LS_PENDING_TRANSACTIONS, JSON.stringify(newPendingTxs));
                    return new Blockchain(prevBlockchain.chain, newPendingTxs);
                });
            }
        };

        p2pService.listen(handleMessage);

    }, [isInitialized, p2pService, wallet, setBlockchain]);


    const addTransaction = useCallback(async (toAddress: string, amount: number) => {
        if (!blockchain || !wallet || !p2pStatus.isP2PEnabled) {
             throw new Error("P2P system is not enabled yet.");
        }
        const balance = blockchain.getBalanceOfAddress(wallet.publicKey);
        if (balance < amount) {
            throw new Error("Insufficient funds.");
        }

        const transactionData: Omit<Transaction, 'signature'> = {
            fromAddress: wallet.publicKey,
            toAddress,
            amount,
            timestamp: Date.now()
        };
        
        const privateKey = await importPrivateKey(wallet.privateKey);
        const dataToSign = calculateTransactionHash(transactionData as Transaction);
        const signature = await sign(privateKey, dataToSign);

        const signedTransaction: Transaction = {
            ...transactionData,
            fromAddress: wallet.publicKey,
            signature: signature
        };
        
        blockchain.pendingTransactions.push(signedTransaction);
        setBlockchain(new Blockchain(blockchain.chain, [...blockchain.pendingTransactions]));
        localStorage.setItem(LS_PENDING_TRANSACTIONS, JSON.stringify(blockchain.pendingTransactions));
        p2pService.broadcastTransaction(signedTransaction);
    }, [blockchain, wallet, p2pStatus.isP2PEnabled, p2pService]);
    
    const balance = useMemo(() => {
        if (!isInitialized || !blockchain || !wallet) return 0;
        return blockchain.getBalanceOfAddress(wallet.publicKey);
    }, [isInitialized, blockchain, wallet, latestBlock]);


    return {
        blockchain,
        wallet,
        balance,
        isInitialized,
        latestBlock,
        addTransaction,
        p2pStatus,
    };
};