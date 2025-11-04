import React, { memo } from 'react';
import type { Block, Transaction } from '../types';
import { ChainIcon, SendIcon } from './Icons';

interface BlockCardProps {
  block: Block;
  coinSymbol: string;
}

const TransactionItem: React.FC<{ tx: Transaction, symbol: string }> = ({ tx, symbol }) => {
  const isReward = tx.fromAddress === null;
  return (
    <div className={`p-2 rounded-md bg-primary/70 flex items-center gap-2 ${isReward ? 'border-l-2 border-warning' : ''}`}>
        <SendIcon className={`h-6 w-6 p-1 rounded-full ${isReward ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'}`} />
        <div className="flex-1 text-xs overflow-hidden">
            <p className="truncate text-gray-400">FROM: <span className="text-gray-200">{isReward ? 'NETWORK REWARD' : tx.fromAddress}</span></p>
            <p className="truncate text-gray-400">TO: <span className="text-gray-200">{tx.toAddress}</span></p>
        </div>
        <div className="text-right">
            <p className={`font-semibold ${isReward ? 'text-warning' : 'text-accent'}`}>{tx.amount.toLocaleString()} {symbol}</p>
            {tx.fee && tx.fee > 0 && (
                <p className="text-xs text-gray-500 italic">+{tx.fee.toLocaleString()} fee</p>
            )}
        </div>
    </div>
  );
};


export const BlockCard: React.FC<BlockCardProps> = memo(({ block, coinSymbol }) => {
  const cardBorderColor = block.isValid ? 'border-success/50' : 'border-danger/50';
  const hashTextColor = block.isValid ? 'text-success' : 'text-danger';

  return (
    <div className={`flex-shrink-0 w-full bg-secondary border ${cardBorderColor} rounded-lg shadow-lg p-4 transition-colors duration-300 relative overflow-hidden`}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-30"></div>
      <h3 className="text-lg font-bold mb-3 text-white">Block #{block.index} {block.index === 0 && '(Genesis)'}</h3>
      
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-gray-400 text-xs">Hash</label>
              <p className={`p-1.5 bg-primary border border-border-color rounded-md mt-1 truncate text-xs ${hashTextColor}`}>{block.hash}</p>
            </div>
            <div className="flex flex-col relative">
              <label className="text-gray-400 text-xs">Previous Hash</label>
              <p className="p-1.5 bg-primary border border-border-color rounded-md mt-1 pr-8 truncate text-xs">{block.previousHash}</p>
              {block.index > 0 && <ChainIcon className="absolute right-2 top-8 text-gray-500" />}
            </div>
        </div>

        <div className="flex flex-col">
          <label className="text-gray-400 text-xs mb-1">Transactions ({block.transactions.length})</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {block.transactions.length > 0 ? block.transactions.map((tx, idx) => (
              <TransactionItem
                key={idx}
                tx={tx}
                symbol={coinSymbol}
              />
            )) : <p className="text-xs text-gray-500 italic">No transactions in this block.</p>}
          </div>
        </div>

      </div>
    </div>
  );
});