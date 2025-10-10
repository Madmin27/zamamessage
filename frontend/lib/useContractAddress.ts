import { useNetwork } from "wagmi";
import { supportedChains } from "./chains";
import { useVersioning } from "../components/VersionProvider";

/**
 * Hook to get the contract address for the current network
 * Returns factoryAddress from supportedChains based on active network
 */
export function useContractAddress(): `0x${string}` | undefined {
  const { chain } = useNetwork();
  const { getSelectedVersion } = useVersioning();
  
  if (!chain) {
    return undefined;
  }

  const selectedVersion = getSelectedVersion(chain.id);
  if (selectedVersion) {
    return selectedVersion.address;
  }

  // Fallback to legacy factory address behaviour
  const chainConfig = Object.values(supportedChains).find((c) => c.id === chain.id);
  if (chainConfig?.factoryAddress && chainConfig.factoryAddress !== "0x0000000000000000000000000000000000000000") {
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
