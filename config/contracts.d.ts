export interface ContractInfo {
  address: string;
  version: string;
  network?: string;
  deployedAt?: string;
  features?: string[];
  reason?: string;
}

export interface ContractsConfig {
  ACTIVE: ContractInfo & { features: string[] };
  DEPRECATED: Array<ContractInfo>;
  FACTORY: { address: string; network?: string };
}

export const CONTRACTS: ContractsConfig;
export const ACTIVE_CONTRACT: string;
export const ACTIVE_VERSION: string;

export const NETWORKS: {
  SEPOLIA: {
    chainId: number;
    name: string;
    rpcUrl: string;
    explorer: string;
  };
};

export function getExplorerUrl(address: string, network?: string): string;
