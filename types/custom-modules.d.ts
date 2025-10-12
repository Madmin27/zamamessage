declare module "config/contracts" {
	export const CONTRACTS: any;
	export const ACTIVE_CONTRACT: string;
	export const ACTIVE_VERSION: string;
	export const NETWORKS: any;
	export function getExplorerUrl(address: string, network?: string): string;
}

// EIP1193 Provider for Zama FHE
interface Window {
	ethereum?: {
		request: (args: { method: string; params?: any[] }) => Promise<any>;
		on?: (event: string, handler: (...args: any[]) => void) => void;
		removeListener?: (event: string, handler: (...args: any[]) => void) => void;
		isMetaMask?: boolean;
	};
}
