# SealedMessage

SealedMessage is a privacy-first messenger for blockchains. Every note you send is encrypted client-side, stored on-chain, and automatically unlocks when the time and conditions you picked are met. The current deployment runs on Ethereum Sepolia and relies on Zama’s Fully Homomorphic Encryption Virtual Machine (FHEVM) so that sensitive content never appears in plaintext on the public ledger.

![Ethereum Sepolia](https://img.shields.io/badge/Ethereum-Sepolia-4d4d4d?style=flat) ![Zama FHE](https://img.shields.io/badge/Zama-FHEVM-14274e?style=flat) ![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?style=flat&logo=next.js)

## Why We Built This
- **Time-released secrets**: Deliver invitations, credentials, or surprises that only become readable after your chosen timestamp.
- **End-to-end privacy on public chains**: Zama FHE lets us keep everything encrypted on-chain while still enforcing business logic like ACL checks or unlock windows.
- **Developer-friendly stack**: Hardhat, TypeScript, and a Next.js frontend make it easy to extend the experience or embed it inside Farcaster frames and other wallets.

## Why Zama FHE
Traditional EVM apps must leak plaintext data to the chain, which defeats the purpose of time-locked messages. Zama’s FHEVM gives us:
- **On-chain computation over ciphertext** using `FHE.fromExternal`, so contract logic verifies permissions without ever decrypting messages.
- **Access control** with `FHE.allowThis` and `FHE.allow`, ensuring only the intended receiver can request decryption from the Zama gateway.
- **Upgradeable privacy**: as Zama rolls out support for new networks, we can extend SealedMessage without rewriting the app.

## Architecture at a Glance
- **Smart contract**: `ConfidentialMessage` (EVM, Solidity 0.8.24) holds encrypted payloads (`euint256`), unlock timestamps, and sender/receiver metadata. Contract ABIs and deployment info are in the `artifacts/` and `deployments/` folders. The latest Sepolia deployment uses address `0x492dC50D888eFFDB0f8D1B3aB9e6C7D8209f9e3B`; legacy contracts remain in `deployments/` if you need backwards compatibility.
- **Frontend**: Next.js 14 with wagmi v1 and RainbowKit handles wallet connections and orchestrates encryption via `@zama-fhe/relayer-sdk`. The SDK is lazily initialised to keep the UI fast.
- **Utilities**: TypeChain typings, Hardhat scripts for compilation, deployment, and quick verification, plus helper scripts for regression testing.

## Getting Started Locally
1. **Clone and install**
	```bash
	git clone https://github.com/Madmin27/zamamessage.git
	cd zamamessage
	npm install

	cd frontend
	npm install
	```
2. **Create environment files**
	- `./.env`
	  ```
	  PRIVATE_KEY=0xYourPrivateKey
	  SEPOLIA_RPC_URL=https://your-sepolia-endpoint
	  ENABLE_FHEVM=true
	  ETHERSCAN_API_KEY=your_etherscan_key
	  ```
	- `./frontend/.env.local`
	  ```
	  NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
	  NEXT_PUBLIC_ZAMA_RELAYER_URL=https://relayer.testnet.zama.cloud
	  NEXT_PUBLIC_ZAMA_ACL_ADDRESS=0x687820221192C5B662b25367F70076A37bc79b6c
	  NEXT_PUBLIC_ZAMA_INPUT_VERIFIER_ADDRESS=0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4
	  NEXT_PUBLIC_ZAMA_VERIFYING_INPUT_ADDRESS=0x7048C39f048125eDa9d678AEbaDfB22F7900a29F
	  NEXT_PUBLIC_ZAMA_VERIFYING_DECRYPTION_ADDRESS=0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1
	  NEXT_PUBLIC_ZAMA_KMS_ADDRESS=0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC
	  NEXT_PUBLIC_ZAMA_GATEWAY_CHAIN_ID=55815
	  NEXT_PUBLIC_CHAIN_ID=11155111
	  NEXT_PUBLIC_CHAIN_NAME=Sepolia
	  NEXT_PUBLIC_CHAIN_KEY=sepolia
	  NEXT_PUBLIC_CHAIN_CURRENCY_SYMBOL=ETH
	  NEXT_PUBLIC_CHAIN_CURRENCY_NAME=Ether
	  NEXT_PUBLIC_CONTRACT_ADDRESS=0x492dC50D888eFFDB0f8D1B3aB9e6C7D8209f9e3B
	  ```
	  Adjust values if you deploy your own contract.
3. **Compile and test**
	```bash
	npm run hardhat:compile
	npm run hardhat:test
	```
4. **Run the dev server**
	```bash
	npm run hardhat:deploy -- --network sepolia   # optional if you need a fresh contract

	cd frontend
	npm run dev
	```
	Next.js defaults to port 3000 (or 3001 if 3000 is busy).

## Using the App
- Connect with a Sepolia wallet via the RainbowKit modal.
- Configure the recipient address, message body, and unlock time (minutes, hours, or a custom timestamp).
- Optionally attach a file; we stream it to IPFS before encrypting the metadata.
- On send, the SDK encrypts the payload, submits the handles and proof to the contract, and you can track the transaction on Sepolia Etherscan.
- Recipients read messages after the unlock time. Decryption happens locally using the handles provided by `getReceivedMessages` and the Zama gateway.

## Self-Hosting Checklist
1. **Backend/contract**: Deploy `ConfidentialMessage` with Hardhat using `npm run hardhat:deploy -- --network sepolia`. For other chains, update `hardhat.config.ts` and environment variables, then redeploy.
2. **Frontend build**:
	```bash
	cd frontend
	npm run build
	npm run start
	```
	Use a process manager like PM2 or systemd to keep the Next.js server running in production.
3. **Environment**: Copy `.env` and `.env.local` templates to your server, fill in RPC URLs, Zama addresses, and your deployed contract address.
4. **HTTPS and domain**: Proxy the Next.js app behind nginx or Caddy with HTTPS. Expose the `/api` routes if you add custom server-side functionality.
5. **Monitoring**: Enable logging for both the Hardhat deployment scripts and Next.js runtime. The SDK will log when encryption is initialised, which helps during upgrades.

## Working With the Codebase
- **Typechain output** lives in `typechain-types/` and is regenerated on each Hardhat compile.
- **Scripts** under `scripts/` include deployment validation and regression checks (`test-confidential-message.ts`).
- **Configuration** files in `frontend/lib/` define supported chains, contract addresses, and SDK overrides.
- When updating contracts, remember to redeploy, update the ABI in `frontend/config/`, and refresh the `NEXT_PUBLIC_CONTRACT_ADDRESS` environment variable.

## Testing Tips
- Use `scripts/test-confidential-message.ts` with `npx ts-node` to exercise the contract without the UI.
- Simulate unlock scenarios by setting short durations (e.g., 60 seconds) and watching the `MessageSent` events in the Sepolia explorer.
- If encryption fails, inspect browser console logs from `frontend/lib/fhevm-instance.ts`; they confirm SDK initialisation and encryption steps.

## Roadmap
- Ship a dedicated decrypt UI so receivers can view plaintext inside the app without copy-pasting handles.
- Extend deployments to Base Sepolia and Scroll once Zama FHE support reaches those networks.
- Layer on notifications (email/webhooks) that trigger as messages unlock.

## License

MIT
