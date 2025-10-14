function parseOptionalNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function applySepoliaRelayerOverrides<T extends Record<string, any>>(baseConfig: T): T {
  const config = { ...baseConfig } as Record<string, any>;

  if (process.env.ZAMA_ACL_ADDRESS) {
    config.aclContractAddress = process.env.ZAMA_ACL_ADDRESS;
  }

  if (process.env.ZAMA_INPUT_VERIFIER_ADDRESS) {
    config.inputVerifierContractAddress = process.env.ZAMA_INPUT_VERIFIER_ADDRESS;
  }

  if (process.env.ZAMA_KMS_ADDRESS) {
    config.kmsContractAddress = process.env.ZAMA_KMS_ADDRESS;
  }

  if (process.env.ZAMA_RELAYER_URL) {
    config.relayerUrl = process.env.ZAMA_RELAYER_URL;
  }

  if (process.env.ZAMA_NETWORK_RPC) {
    config.network = process.env.ZAMA_NETWORK_RPC;
  }

  const gatewayChainId = parseOptionalNumber(process.env.ZAMA_GATEWAY_CHAIN_ID);
  if (gatewayChainId !== undefined) {
    config.gatewayChainId = gatewayChainId;
  }

  if (process.env.ZAMA_VERIFYING_DECRYPTION_ADDRESS) {
    config.verifyingContractAddressDecryption = process.env.ZAMA_VERIFYING_DECRYPTION_ADDRESS;
  }

  if (process.env.ZAMA_VERIFYING_INPUT_ADDRESS) {
    config.verifyingContractAddressInputVerification = process.env.ZAMA_VERIFYING_INPUT_ADDRESS;
  }

  return config as T;
}
