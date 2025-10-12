import { useNetwork } from "wagmi";
import { getZamaContractAddress } from "./chains";

/**
 * Hook to get the Zama FHE contract address for the current network
 * No version switching - always returns Zama contract
 */
export function useContractAddress(): `0x${string}` | undefined {
  const { chain } = useNetwork();
  
  if (!chain) {
    return undefined;
  }

  return getZamaContractAddress(chain.id);
}

/**
 * Check if current network has a deployed Zama contract
 */
export function useHasContract(): boolean {
  const address = useContractAddress();
  return !!address;
}
