import { useNetwork } from "wagmi";
import { supportedChains } from "./chains";

/**
 * Hook to get the contract address for the current network
 * Returns factoryAddress from supportedChains based on active network
 */
export function useContractAddress(): `0x${string}` | undefined {
  const { chain } = useNetwork();
  
  if (!chain) {
    return undefined;
  }

  // Find matching chain in supportedChains
  const chainConfig = Object.values(supportedChains).find(
    (c) => c.id === chain.id
  );

  // Return factory address if it exists and is not zero address
  if (
    chainConfig?.factoryAddress &&
    chainConfig.factoryAddress !== "0x0000000000000000000000000000000000000000"
  ) {
    return chainConfig.factoryAddress as `0x${string}`;
  }

  return undefined;
}

/**
 * Check if current network has a deployed contract
 */
export function useHasContract(): boolean {
  const address = useContractAddress();
  return !!address;
}
