"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNetwork } from "wagmi";
import { useVersioning } from "./VersionProvider";

export function VersionSwitcher() {
  const { chain } = useNetwork();
  const { getAvailableVersions, getSelectedVersion, selectVersion } = useVersioning();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const versions = useMemo(() => getAvailableVersions(chain?.id), [chain?.id, getAvailableVersions]);
  const selected = useMemo(() => getSelectedVersion(chain?.id), [chain?.id, getSelectedVersion]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!chain || versions.length <= 1 || !selected) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 shadow-lg backdrop-blur transition hover:border-sky-400 hover:bg-slate-900/80"
      >
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Contract Version</span>
          <span className="text-sm text-aurora">{selected.label}</span>
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl">
          <div className="divide-y divide-slate-800">
            {versions.map((version) => {
              const isActive = version.key === selected.key;
              return (
                <button
                  key={version.key}
                  onClick={() => {
                    selectVersion(chain.id, version.key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 transition ${
                    isActive
                      ? "bg-aurora/10 text-aurora"
                      : "text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{version.label}</p>
                      {version.description && (
                        <p className="mt-1 text-xs text-slate-400">{version.description}</p>
                      )}
                    </div>
                    {isActive && <span className="text-aurora">✓</span>}
                  </div>
                  {version.deployedAt && (
                    <p className="mt-1 text-xs text-slate-500">Deployed: {version.deployedAt}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
