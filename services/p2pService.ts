import type { Block, Transaction } from '../types';

export type P2PMessage = 
    | { type: 'CHAIN_BROADCAST', payload: Block[] }
    | { type: 'TRANSACTION_BROADCAST', payload: Transaction };

const CHANNEL_NAME = 'shadow-coin-network';

export class P2PService {
    private channel: BroadcastChannel;

    constructor() {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
    }

    public listen(onMessageCallback: (message: P2PMessage) => void) {
        this.channel.onmessage = (event: MessageEvent<P2PMessage>) => {
            onMessageCallback(event.data);
        };
    }
    
    public broadcastChain(chain: Block[]) {
        this.channel.postMessage({
            type: 'CHAIN_BROADCAST',
            payload: chain
        });
    }

    public broadcastTransaction(transaction: Transaction) {
        this.channel.postMessage({
            type: 'TRANSACTION_BROADCAST',
            payload: transaction
        });
    }

    public close() {
        this.channel.close();
    }
}