"use client";

import { useNetwork, useSwitchNetwork } from 'wagmi';
import { supportedChains, type ChainKey } from '../lib/chains';
import { useState, useRef, useEffect } from 'react';

export function NetworkSwitcher() {
  const { chain } = useNetwork();
  const { switchNetwork, isLoading } = useSwitchNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const testnets = Object.entries(supportedChains).filter(([_, config]) => config.testnet);
  const mainnets = Object.entries(supportedChains).filter(([_, config]) => !config.testnet);

  const displayChains = showAll 
    ? [...testnets, ...mainnets] 
    : testnets;

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Compact Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 shadow-lg backdrop-blur transition hover:border-aurora hover:bg-slate-900/80"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌐</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-200">Ağ Seçimi</p>
            <p className="text-xs text-slate-400">
              {!mounted ? (
                'Yükleniyor...'
              ) : chain ? (
                <>Aktif: <span className="font-semibold text-green-400">{chain.name}</span></>
              ) : (
                'Ağ seçin'
              )}
            </p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-[500px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 border-b border-slate-700 bg-slate-900 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-aurora">Ağ Seçimi</h3>
              <button
                onClick={() => setShowAll(!showAll)}
                className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                {showAll ? '🧪 Sadece Testnet' : '🌐 Tüm Ağlar'}
              </button>
            </div>
          </div>

          {/* Chain List */}
          <div className="p-2">
            {displayChains.map(([key, chainConfig]) => {
              const isActive = chain?.id === chainConfig.id;
              const isSupported = switchNetwork && Object.keys(switchNetwork).length > 0;
              const hasFactory = chainConfig.factoryAddress !== '0x0000000000000000000000000000000000000000';

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (!isActive && isSupported) {
                      switchNetwork?.(chainConfig.id);
                      setIsOpen(false);
                    }
                  }}
                  disabled={isActive || isLoading || !isSupported}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 mb-2 text-left transition ${
                    isActive
                      ? 'border-green-500 bg-green-900/30'
                      : isSupported
                      ? 'border-slate-700 bg-slate-800/50 hover:border-aurora hover:bg-slate-800'
                      : 'cursor-not-allowed border-slate-800 bg-slate-900/30 opacity-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        {chainConfig.name}
                      </span>
                      {isActive && (
                        <span className="text-green-400">✓</span>
                      )}
                    </div>
                    
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {chainConfig.nativeCurrency.symbol}
                      </span>
                      
                      {chainConfig.testnet && (
                        <span className="rounded bg-yellow-900/30 px-1.5 py-0.5 text-xs text-yellow-400">
                          Testnet
                        </span>
                      )}
                      
                      {!hasFactory && (
                        <span className="text-xs text-orange-400">
                          ⚠️ Factory yok
                        </span>
                      )}
                    </div>
                  </div>

                  {isLoading && (
                    <svg className="h-4 w-4 animate-spin text-aurora" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          {!showAll && mainnets.length > 0 && (
            <div className="border-t border-slate-700 bg-blue-900/20 px-4 py-3">
              <p className="text-xs text-blue-200">
                💡 <strong>{mainnets.length} mainnet</strong> daha mevcut. "Tüm Ağlar" butonuna tıklayın.
              </p>
            </div>
          )}

          <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-3">
            <h4 className="text-xs font-semibold text-slate-300">📌 Not:</h4>
            <ul className="mt-1 space-y-1 text-xs text-slate-400">
              <li>• Testnetlerde ücretsiz token alabilirsiniz (faucet)</li>
              <li>• Mainnetlerde gerçek para harcanır</li>
              <li>• Factory contract her ağda ayrı deploy edilmelidir</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
