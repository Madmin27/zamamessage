function parseOptionalNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function withSepoliaOverrides<T extends Record<string, any>>(baseConfig: T): T {
  const config = { ...baseConfig } as Record<string, any>;

  if (process.env.NEXT_PUBLIC_ZAMA_ACL_ADDRESS) {
    config.aclContractAddress = process.env.NEXT_PUBLIC_ZAMA_ACL_ADDRESS;
  }

  if (process.env.NEXT_PUBLIC_ZAMA_INPUT_VERIFIER_ADDRESS) {
    config.inputVerifierContractAddress = process.env.NEXT_PUBLIC_ZAMA_INPUT_VERIFIER_ADDRESS;
  }

  if (process.env.NEXT_PUBLIC_ZAMA_KMS_ADDRESS) {
    config.kmsContractAddress = process.env.NEXT_PUBLIC_ZAMA_KMS_ADDRESS;
  }

  if (process.env.NEXT_PUBLIC_ZAMA_RELAYER_URL) {
    config.relayerUrl = process.env.NEXT_PUBLIC_ZAMA_RELAYER_URL;
  }

  if (process.env.NEXT_PUBLIC_ZAMA_NETWORK_RPC) {
    config.network = process.env.NEXT_PUBLIC_ZAMA_NETWORK_RPC;
  }

  const gatewayChainId = parseOptionalNumber(process.env.NEXT_PUBLIC_ZAMA_GATEWAY_CHAIN_ID);
  if (gatewayChainId !== undefined) {
    config.gatewayChainId = gatewayChainId;
  }

  if (process.env.NEXT_PUBLIC_ZAMA_VERIFYING_DECRYPTION_ADDRESS) {
    config.verifyingContractAddressDecryption = process.env.NEXT_PUBLIC_ZAMA_VERIFYING_DECRYPTION_ADDRESS;
  }

  if (process.env.NEXT_PUBLIC_ZAMA_VERIFYING_INPUT_ADDRESS) {
    config.verifyingContractAddressInputVerification = process.env.NEXT_PUBLIC_ZAMA_VERIFYING_INPUT_ADDRESS;
  }

  return config as T;
}
