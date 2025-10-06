const ensure = (value: string | undefined, fallback: string) => value ?? fallback;

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const chainId = parseNumber(process.env.NEXT_PUBLIC_CHAIN_ID, 31337);

export const appConfig = {
  contractAddress: ensure(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, "0x0000000000000000000000000000000000000000"),
  chain: {
    id: chainId,
    name: ensure(process.env.NEXT_PUBLIC_CHAIN_NAME, chainId === 31337 ? "Hardhat" : "Custom FHEVM"),
    network: ensure(process.env.NEXT_PUBLIC_CHAIN_KEY, "custom-fhevm"),
    nativeCurrency: {
      name: ensure(process.env.NEXT_PUBLIC_CHAIN_CURRENCY_NAME, "Ether"),
      symbol: ensure(process.env.NEXT_PUBLIC_CHAIN_CURRENCY_SYMBOL, "ETH"),
      decimals: parseNumber(process.env.NEXT_PUBLIC_CHAIN_DECIMALS, 18)
    },
    rpcUrl: ensure(process.env.NEXT_PUBLIC_RPC_URL, "http://127.0.0.1:8545"),
    explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || undefined
  }
};
