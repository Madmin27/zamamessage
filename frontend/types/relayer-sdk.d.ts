// Type definitions for @zama-fhe/relayer-sdk
// Based on EmelMarket's implementation

declare module "@zama-fhe/relayer-sdk" {
  export interface RelayerSDK {
    createEncryptedInput(contractAddress: string, userAddress: string): EncryptedInput;
  }

  export interface EncryptedInput {
    add64(value: bigint): EncryptedInput;
    encrypt(): Promise<EncryptedResult>;
  }

  export interface EncryptedResult {
    handles: string[];
    inputProof: string;
  }

  export const SepoliaConfig: {
    chainId: number;
    gatewayChainId: number;
    aclContractAddress: string;
    kmsContractAddress: string;
    inputVerifierContractAddress: string;
    verifyingContractAddressDecryption: string;
    verifyingContractAddressInputVerification: string;
    relayerUrl: string;
    network: string;
  };

  export function initSDK(): Promise<void>;
  export function createInstance(config: typeof SepoliaConfig): Promise<RelayerSDK>;
}

declare module "@zama-fhe/relayer-sdk/bundle" {
  export * from "@zama-fhe/relayer-sdk";
}
