declare module "config/contracts" {
	export const CONTRACTS: any;
	export const ACTIVE_CONTRACT: string;
	export const ACTIVE_VERSION: string;
	export const NETWORKS: any;
	export function getExplorerUrl(address: string, network?: string): string;
}

