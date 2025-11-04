import React, { useState, useEffect, useMemo } from 'react';
import { CubeIcon, NetworkNodeIcon } from './Icons';
import type { Block } from '../types';

interface NetworkVisualizerProps {
  latestBlock: Block | null;
}

// FIX: Replaced the corrupted base64 string with a valid 1x1 transparent GIF placeholder.
// The original string was extremely long, appeared to be truncated and malformed, which could cause parsing errors with some build tools.
const lionMascotBase64 = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const nodePositions = [
    { top: '15%', left: '10%' },
    { top: '20%', left: '88%' },
    { top: '50%', left: '20%' },
    { top: '55%', left: '80%' },
    { top: '85%', left: '15%' },
    { top: '80%', left: '90%' },
];


export const NetworkVisualizer: React.FC<NetworkVisualizerProps> = ({ latestBlock }) => {
  const [animatingBlock, setAnimatingBlock] = useState<Block | null>(null);

  useEffect(() => {
    if (latestBlock) {
      setAnimatingBlock(latestBlock);
      const timer = setTimeout(() => {
        setAnimatingBlock(null);
      }, 2000); // Animation duration must match tailwind config
      return () => clearTimeout(timer);
    }
  }, [latestBlock]);
  
  const targetPosition = useMemo(() => {
      if (!animatingBlock) return null;
      return nodePositions[animatingBlock.index % nodePositions.length];
  }, [animatingBlock]);


  return (
    <div className="fixed inset-0 z-0 opacity-60">
       <svg className="absolute inset-0 w-full h-full" width="100%" height="100%">
            {nodePositions.map((pos, i) => (
                 <line key={i} x1="50%" y1="50%" x2={pos.left} y2={pos.top} stroke="#3A3D5E" strokeWidth="1" strokeDasharray="4 2" />
            ))}
        </svg>

        <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
            title="Mainframe Core"
        >
            <div className="w-24 h-24 bg-primary border-2 border-yellow-400 rounded-full flex items-center justify-center animate-star-pulse">
                 <img src={lionMascotBase64} alt="Shadow Coin Mascot" className="w-full h-full object-cover rounded-full" />
            </div>
        </div>
        
        {nodePositions.map((pos, i) => (
             <div 
                key={i} 
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                style={pos}
                title="Network Node"
            >
                <div className="w-10 h-10 bg-primary border-2 border-accent rounded-full flex items-center justify-center animate-pulse-glow shadow-accent">
                    <NetworkNodeIcon className="w-5 h-5 text-accent"/>
                </div>
            </div>
        ))}
        
        {animatingBlock && targetPosition && (
            <div 
                className="absolute top-1/2 left-1/2 text-accent animate-propagate z-10"
                style={{
                  // @ts-ignore
                  '--end-x': targetPosition.left,
                  '--end-y': targetPosition.top
                }}
              >
                <CubeIcon className="w-8 h-8" />
            </div>
        )}
    </div>
  );
};
