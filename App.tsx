import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBlockchain } from './hooks/useBlockchain';
import { NetworkVisualizer } from './components/NetworkVisualizer';
import { LiveMiningStatus } from './components/CpuMainframe';
import { BlockCard } from './components/BlockCard';
import { ShadowLogoIcon, CopyIcon, SendIcon } from './components/Icons';
import type { Block } from './types';

const App: React.FC = () => {
    const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('shadowCoinCurrentUser'));

    const handleRegister = (email: string) => {
        localStorage.setItem('shadowCoinCurrentUser', email);
        setUserEmail(email);
    };

    if (!userEmail) {
        return <RegistrationPage onRegister={handleRegister} />;
    }

    return <MainframeApp userEmail={userEmail} />;
};

const RegistrationPage: React.FC<{ onRegister: (email: string) => void }> = ({ onRegister }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        onRegister(email);
    };

    return (
        <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
            <main className="text-center flex flex-col items-center bg-secondary border border-border-color p-8 rounded-lg shadow-lg max-w-sm w-full">
                <ShadowLogoIcon className="h-20 w-20 text-accent" />
                <h1 className="text-3xl font-bold text-white mt-4">Shadow Coin Mainframe</h1>
                <p className="text-gray-400 mt-2">Enter your email to connect to the network.</p>
                <form onSubmit={handleSubmit} className="w-full mt-6 flex flex-col gap-4">
                    <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        placeholder="your-email@example.com"
                        className="w-full p-3 bg-primary border border-border-color rounded-md text-center text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                        required
                    />
                    {error && <p className="text-danger text-sm">{error}</p>}
                    <button type="submit" className="bg-accent text-primary font-bold py-3 px-8 rounded-md hover:bg-opacity-80 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-accent">
                        Connect
                    </button>
                </form>
            </main>
        </div>
    );
};

const MainframeApp: React.FC<{ userEmail: string }> = ({ userEmail }) => {
    const { blockchain, wallet, balance, isInitialized, latestBlock, addTransaction, p2pStatus } = useBlockchain(userEmail);

    if (!isInitialized || !wallet) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-accent">
                <ShadowLogoIcon className="h-24 w-24 animate-pulse" />
                <h1 className="text-2xl mt-4 font-bold">Connecting to Mainframe...</h1>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-primary text-gray-300 font-mono relative overflow-hidden">
            <NetworkVisualizer latestBlock={latestBlock} />
            <div className="relative z-10 flex flex-col lg:flex-row h-screen p-4 gap-4">
                
                {/* Left Panel */}
                <aside className="lg:w-1/4 flex flex-col gap-4">
                    <WalletPanel 
                        publicKey={wallet.publicKey} 
                        balance={balance} 
                    />
                    <P2PStatusPanel 
                        isP2PEnabled={p2pStatus.isP2PEnabled} 
                        timeUntilP2P={p2pStatus.timeUntilP2P} 
                    />
                    <TransactionPanel 
                        addTransaction={addTransaction} 
                        isP2PEnabled={p2pStatus.isP2PEnabled} 
                    />
                </aside>

                {/* Right Panel - Blockchain Stream */}
                <main className="lg:w-3/4 flex flex-col gap-4">
                    <LiveMiningStatus blockchain={blockchain} />
                    <div className="flex-grow bg-secondary/80 border border-border-color rounded-lg p-4 backdrop-blur-sm overflow-hidden flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-4">Blockchain Record</h2>
                        <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin">
                            <div className="flex flex-col-reverse gap-4">
                                {blockchain.chain.map(block => (
                                    <BlockCard key={block.hash} block={block} coinSymbol="SHDW" />
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const WalletPanel: React.FC<{ publicKey: string, balance: number }> = ({ publicKey, balance }) => (
    <div className="bg-secondary/80 border border-border-color rounded-lg p-4 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-white">My Wallet</h2>
        <div className="mt-3 text-sm space-y-2">
            <p className="text-gray-400">Balance:</p>
            <p className="text-2xl font-bold text-accent">{balance.toLocaleString()} SHDW</p>
            <p className="text-gray-400 mt-2">Address:</p>
            <div className="flex items-center gap-2">
                <p className="text-xs text-gray-300 truncate bg-primary p-2 rounded-md flex-1">{publicKey}</p>
                <button onClick={() => navigator.clipboard.writeText(publicKey)} className="p-2 bg-primary rounded-md hover:bg-border-color">
                    <CopyIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);

const P2PStatusPanel: React.FC<{ isP2PEnabled: boolean; timeUntilP2P: string }> = ({ isP2PEnabled, timeUntilP2P }) => (
     <div className="bg-secondary/80 border border-border-color rounded-lg p-4 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-white">P2P Network Status</h2>
        {isP2PEnabled ? (
            <p className="mt-2 text-success font-bold">P2P Trading & Messaging: ENABLED</p>
        ) : (
            <div className="mt-2">
                <p className="text-warning">P2P Trading & Messaging: OFFLINE</p>
                <p className="text-sm text-gray-400">Activating in:</p>
                <p className="text-2xl font-bold text-accent">{timeUntilP2P}</p>
            </div>
        )}
    </div>
);

const TransactionPanel: React.FC<{ addTransaction: (to: string, amount: number) => Promise<void>; isP2PEnabled: boolean }> = ({ addTransaction, isP2PEnabled }) => {
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const numAmount = parseFloat(amount);
        if (!toAddress || !numAmount || numAmount <= 0) {
            setError('Invalid address or amount.');
            return;
        }
        try {
            await addTransaction(toAddress, numAmount);
            setToAddress('');
            setAmount('');
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
        }
    };

    return (
        <div className={`bg-secondary/80 border border-border-color rounded-lg p-4 backdrop-blur-sm transition-opacity duration-500 ${!isP2PEnabled ? 'opacity-50' : ''}`}>
             <h2 className="text-lg font-bold text-white">Send SHDW</h2>
             <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                 <div>
                     <label className="text-xs text-gray-400">Recipient Address</label>
                     <input type="text" value={toAddress} onChange={e => setToAddress(e.target.value)} disabled={!isP2PEnabled} className="w-full mt-1 p-2 bg-primary border border-border-color rounded-md text-xs disabled:cursor-not-allowed" />
                 </div>
                 <div>
                     <label className="text-xs text-gray-400">Amount</label>
                     <input type="number" value={amount} onChange={e => setAmount(e.target.value)} disabled={!isP2PEnabled} className="w-full mt-1 p-2 bg-primary border border-border-color rounded-md text-xs disabled:cursor-not-allowed" />
                 </div>
                 {error && <p className="text-danger text-xs">{error}</p>}
                 <button type="submit" disabled={!isP2PEnabled} className="w-full flex items-center justify-center gap-2 bg-accent text-primary font-bold py-2 rounded-md disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-opacity-80 transition-colors">
                     <SendIcon className="w-4 h-4" />
                     Broadcast Transaction
                 </button>
             </form>
        </div>
    );
};

export default App;