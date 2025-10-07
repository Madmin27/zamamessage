# 🔐 SealedMessage

**When conditions intersect, the seal breaks.**

Time-locked encrypted messaging dApp built on Base blockchain.

![Base](https://img.shields.io/badge/Base-Sepolia-blue?style=for-the-badge&logo=ethereum)
![Farcaster](https://img.shields.io/badge/Farcaster-Mini%20App-purple?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)

## 🌟 Live Demo

**🔗 [zama.minen.com.tr](https://zama.minen.com.tr)**

**🎭 Farcaster Mini App**: Share the URL on Warpcast!

## ✨ Features

- ⏰ **Time-Locked Messages** - Messages unlock at a specific future time
- 🔐 **Receiver-Only Privacy** - Only the receiver can read the message content
- 🌐 **Multi-Chain Support** - Base Sepolia, Ethereum Sepolia, Monad Testnet
- 🎭 **Farcaster Integration** - Native Mini App with SDK support
- 🎨 **Beautiful UI** - Dark theme with aurora gradients
- 📱 **Mobile Optimized** - Responsive design
- 🦊 **MetaMask Integration** - RainbowKit wallet connection

## 🚀 Quick Start

### Try It Now
1. Visit [zama.minen.com.tr](https://zama.minen.com.tr)
2. Connect your wallet (MetaMask)
3. Switch to Base Sepolia or Sepolia testnet
4. Send a time-locked message!

### Local Development

```bash
# Clone repository
git clone https://github.com/Madmin27/zamamessage.git
cd zamamessage

# Install dependencies
npm install
cd frontend && npm install

# Start frontend
npm run dev
```

## 📱 Farcaster Mini App

SealedMessage is a verified Farcaster Mini App:
- ✅ Account association verified (FID: 599667)
- ✅ Base Builder integration
- ✅ SDK ready() implementation
- ✅ Open Graph preview cards
- ✅ Native wallet integration

[📖 Read Farcaster Guide →](./ACCOUNT_ASSOCIATION_GUIDE.md)

## 🔗 Deployed Contracts

| Network | Address | Chain ID |
|---------|---------|----------|
| **Sepolia** | `0xA52bD90D699D00781F6610631E22703526c69aF5` | 11155111 |
| **Base Sepolia** | `0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5` | 84532 |
| **Monad Testnet** | `0xD7DE0BB23A63F920E11aaDcB77932D2f5fe4738b` | 10200 |

## 🛠️ Tech Stack

- **Frontend**: Next.js 14.2, React 18, TailwindCSS
- **Web3**: wagmi v1, RainbowKit, ethers v6
- **SDK**: @farcaster/frame-sdk
- **Smart Contracts**: Solidity, Hardhat
- **Deployment**: Base, Ethereum, Monad

## 📚 Documentation

- [Farcaster Mini App Guide](./ACCOUNT_ASSOCIATION_GUIDE.md)
- [Multi-Chain Deployment](./MULTICHAIN_V2.2.md)
- [English README](./README_EN.md)

## �� Roadmap

- [ ] FHE (Fully Homomorphic Encryption) integration
- [ ] Additional chain support (Linea, Arbitrum, Optimism)
- [ ] Notification system via webhooks
- [ ] Screenshot gallery for App Store
- [ ] Mobile app wrapper

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with 🔐 by SealedMessage Team**
