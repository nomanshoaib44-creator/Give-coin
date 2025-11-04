import React, { useState, useEffect, useMemo } from 'react';
import { CpuIcon } from './Icons';
// FIX: Correctly import the Blockchain type now that it is exported.
import type { Blockchain } from '../hooks/useBlockchain';

const FOUR_YEARS_IN_MS = 4 * 365.25 * 24 * 60 * 60 * 1000;
const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
const INITIAL_REWARD = 50;

const CpuUsageVisualizer: React.FC<{ isMining: boolean }> = ({ isMining }) => {
  const coreCount = useMemo(() => navigator.hardwareConcurrency || 8, []);
  const [usage, setUsage] = useState(() => Array(coreCount).fill(0));

  useEffect(() => {
    if (!isMining) {
      setUsage(Array(coreCount).fill(2)); // Set a low, idle state
      return;
    }

    const interval = setInterval(() => {
      setUsage(prevUsage => 
        prevUsage.map(() => Math.random() * 65 + 10) // Simulate usage between 10% and 75%
      );
    }, 400);

    return () => clearInterval(interval);
  }, [isMining, coreCount]);

  return (
    <div className="w-full pt-3 mt-3 border-t border-border-color">
      <h4 className="text-xs text-gray-400 mb-2 tracking-widest">CPU CORE ACTIVITY</h4>
      <div className="flex items-end gap-1.5 h-16 bg-primary/50 p-2 rounded-md border border-black/20">
        {usage.map((u, i) => (
          <div key={i} className="flex-1 h-full bg-border-color/20 rounded-sm overflow-hidden flex flex-col-reverse relative">
             <div 
              className="bg-accent transition-all duration-300 ease-in-out"
              style={{ 
                height: `${u}%`,
                boxShadow: '0 0 4px rgba(125, 249, 255, 0.4)' 
              }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};


// FIX: Update prop type from `any` to `Blockchain` for better type safety.
export const LiveMiningStatus: React.FC<{ blockchain: Blockchain }> = ({ blockchain }) => {
  const [nextPayout, setNextPayout] = useState<string>('--:--');
  const [nextHalvingDate, setNextHalvingDate] = useState<string>('Calculating...');
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);

  useEffect(() => {
    const creationDateStr = localStorage.getItem('shadowCoinCreationDate');
    if (!creationDateStr || !blockchain) return;
    const creationDate = parseInt(creationDateStr, 10);
    
    // Calculate current reward and halving
    const timeSinceCreation = Date.now() - creationDate;
    const halvings = Math.floor(timeSinceCreation / FOUR_YEARS_IN_MS);
    const currentReward = INITIAL_REWARD / Math.pow(2, halvings);
    setRewardAmount(currentReward);
    
    const nextHalvingTime = creationDate + (halvings + 1) * FOUR_YEARS_IN_MS;
    setNextHalvingDate(new Date(nextHalvingTime).toLocaleDateString());

    setTotalSupply(blockchain.getTotalSupply());

    // Calculate next payout timer
    const timer = setInterval(() => {
      const msSinceEpoch = Date.now();
      const msIntoCurrentInterval = (msSinceEpoch - creationDate) % TEN_MINUTES_IN_MS;
      const msLeft = TEN_MINUTES_IN_MS - msIntoCurrentInterval;
      
      const minutes = Math.floor((msLeft / 1000 / 60) % 60);
      const seconds = Math.floor((msLeft / 1000) % 60);
      
      setNextPayout(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [blockchain]);

  const isCapped = totalSupply >= 100000000;

  return (
    <div className="bg-secondary/80 border border-border-color rounded-lg p-4 flex flex-col gap-2 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4 self-start">
            <div className="relative">
            <CpuIcon className={`h-12 w-12 text-accent ${!isCapped ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} />
            <div className={`absolute inset-0 rounded-full bg-accent/10 ${!isCapped ? 'animate-ping' : ''}`}></div>
            </div>
            <div>
            <h3 className="font-bold text-lg text-white">Life-Mining Status</h3>
            <p className={`text-sm ${isCapped ? 'text-warning' : 'text-success'}`}>{isCapped ? 'Total supply reached. Mining halted.' : 'Automatic SHDW rewards are active.'}</p>
            </div>
        </div>
        <div className="flex gap-4 text-center self-start sm:self-center">
            <div>
                <p className="text-xs text-gray-400">Next Block</p>
                <p className="text-xl font-bold text-accent">{isCapped ? '--:--' : nextPayout}</p>
            </div>
            <div>
                <p className="text-xs text-gray-400">Current Reward</p>
                <p className="text-xl font-bold text-accent">{isCapped ? 0 : rewardAmount} SHDW</p>
            </div>
            <div>
                <p className="text-xs text-gray-400">Next Halving</p>
                <p className="text-xl font-bold text-accent">{nextHalvingDate}</p>
            </div>
        </div>
      </div>
      <CpuUsageVisualizer isMining={!isCapped} />
    </div>
  );
};