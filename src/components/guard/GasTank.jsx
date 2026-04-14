import { useState, useEffect } from 'react';
import { Fuel } from 'lucide-react';
import TopOffModal from './TopOffModal';

/**
 * Gas Tank — car-style fuel gauge for Hold wallet gas reserve.
 * Shows how much ETH is available for transaction fees.
 */
export default function GasTank({ balanceEth = 0, heldAmount = 0, vaultBalance = 0, ethPrice = 2450, onTopOff }) {
  const [showTopOff, setShowTopOff] = useState(false);
  // Gas reserve = balance minus what's held for transactions
  const gasReserve = Math.max(0, balanceEth - heldAmount);
  
  // Typical Sepolia/mainnet gas cost for a transfer ~0.002-0.005 ETH
  // Full tank = enough for ~10 transactions (~0.05 ETH)
  const FULL_TANK = 0.05;
  const fillPercent = Math.min(100, (gasReserve / FULL_TANK) * 100);
  
  // Color based on fill level
  const getColor = () => {
    if (fillPercent >= 50) return { fill: 'text-emerald-400', bg: 'bg-emerald-400', label: 'Good' };
    if (fillPercent >= 25) return { fill: 'text-amber-400', bg: 'bg-amber-400', label: 'Low' };
    return { fill: 'text-red-400', bg: 'bg-red-400', label: 'Empty' };
  };
  
  const color = getColor();
  
  // Needle rotation: -90deg (empty/left) to 90deg (full/right)
  const needleAngle = -90 + (fillPercent / 100) * 180;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Fuel className={`w-4 h-4 ${color.fill}`} />
        <span className="text-sm font-medium text-foreground">Gas Tank</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          fillPercent >= 50 
            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' 
            : fillPercent >= 25 
              ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
              : 'bg-red-400/10 text-red-400 border-red-400/30'
        }`}>{color.label}</span>
      </div>
      
      {/* Gauge */}
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-14 flex-shrink-0">
          <svg viewBox="0 0 120 70" className="w-full h-full">
            {/* Gauge background arc */}
            <path
              d="M 15 60 A 50 50 0 0 1 105 60"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Gauge colored fill */}
            <path
              d="M 15 60 A 50 50 0 0 1 105 60"
              fill="none"
              stroke={fillPercent >= 50 ? '#34d399' : fillPercent >= 25 ? '#fbbf24' : '#f87171'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${fillPercent * 1.42} 142`}
            />
            {/* E and F labels */}
            <text x="8" y="68" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600">E</text>
            <text x="103" y="68" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600">F</text>
            {/* Needle */}
            <g transform={`rotate(${needleAngle}, 60, 60)`}>
              <line x1="60" y1="60" x2="60" y2="20" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="60" cy="60" r="4" fill="hsl(var(--foreground))" />
            </g>
          </svg>
        </div>
        
        <div className="flex-1">
          <div className="text-lg font-bold text-foreground font-mono">
            {gasReserve.toFixed(4)} <span className="text-sm text-muted-foreground font-normal">ETH</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            ≈ ${(gasReserve * ethPrice).toFixed(2)} USD
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {gasReserve > 0.002 
              ? `~${Math.floor(gasReserve / 0.003)} transactions worth of gas`
              : 'Top up to process pending transactions'
            }
          </div>
          {fillPercent < 25 && (
            <div className="mt-1 text-xs text-red-400 font-medium">
              ⚠ Gas too low — transactions may fail
            </div>
          )}
        </div>
      </div>

      {/* Top Off button */}
      <button
        onClick={() => setShowTopOff(true)}
        className={`max-w-[280px] mt-3 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
          fillPercent < 50
            ? 'bg-guard/20 text-guard border border-guard/30 hover:bg-guard/30'
            : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
        }`}
      >
        <Fuel className="w-3.5 h-3.5" />
        {fillPercent < 25 ? 'Fill Up — Tank Empty' : fillPercent < 50 ? 'Top Off Gas Tank' : 'Add Gas'}
      </button>

      {showTopOff && (
        <TopOffModal
          currentGas={gasReserve}
          vaultBalance={vaultBalance}
          ethPrice={ethPrice}
          onClose={() => setShowTopOff(false)}
          onComplete={() => {
            setShowTopOff(false);
            onTopOff?.();
          }}
        />
      )}
    </div>
  );
}
