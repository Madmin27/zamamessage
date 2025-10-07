# 🔐 SealedMessage - Time-Locked Messages on Base

**Time-locked encrypted messaging dApp** built with privacy-first architecture on Base blockchain.

![Base](https://img.shields.io/badge/Base-Sepolia-blue?style=for-the-badge&logo=ethereum)
![Farcaster](https://img.shields.io/badge/Farcaster-Mini%20App-purple?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![License](https://img.shields.io/badge/license-MIT-informational?style=for-the-badge)

## 🌟 Live Demo

**🔗 [zama.minen.com.tr](https://zama.minen.com.tr)**

**🎭 Farcaster Mini App**: Share the URL on Warpcast to try the embedded experience!

## ✨ Features

- ⏰ **Time-Locked Messages** - Messages unlock at a specific future time
- 🔐 **Receiver-Only Privacy** - Only the receiver can read the message content
- 🌐 **Multi-Chain Support** - Works on Base Sepolia, Ethereum Sepolia, and more
- 🎭 **Farcaster Integration** - Native Mini App support for social sharing
- 🎨 **Beautiful UI** - Modern dark theme with aurora gradients
- 📱 **Mobile Optimized** - Responsive design for all devices
- 🦊 **MetaMask Integration** - Seamless wallet connection with RainbowKit

## 🚀 Quick Start

### Try It Now
1. Visit [zama.minen.com.tr](https://zama.minen.com.tr)
2. Connect your wallet (MetaMask)
3. Switch to Base Sepolia or Sepolia testnet
4. Send a time-locked message!

### Share on Farcaster
Simply paste the URL in a Warpcast cast:
```
https://zama.minen.com.tr
```
The Mini App preview will appear automatically!

## 📱 Farcaster Mini App

SealedMessage is available as a Farcaster Mini App with:
- ✅ Manifest configuration for Base networks
- ✅ Open Graph preview cards
- ✅ Frame support with interactive buttons
- ✅ Native wallet integration

[📖 Read Farcaster Integration Guide →](./FARCASTER_MINIAPP.md)

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14.2 (App Router)
- **Styling**: TailwindCSS
- **Web3**: wagmi v1, RainbowKit, ethers v6
- **Blockchain**: Base Sepolia, Ethereum Sepolia

### Smart Contracts
- **Language**: Solidity 0.8.24
- **Framework**: Hardhat
- **Testing**: Chai + Hardhat Network
- **Networks**: Multi-chain deployment (6 testnets)

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/Madmin27/zamamessage.git
cd zamamessage

# Install dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

## 🔨 Development

### Smart Contracts
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy-v2.2.ts --network baseSepolia
```

### Frontend
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build
npm start
```

## 🌐 Deployed Networks

| Network | Contract Address | Explorer |
|---------|-----------------|----------|
| **Base Sepolia** | `0xa149...C4B5` | [BaseScan](https://sepolia.basescan.org/address/0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5) |
| **Ethereum Sepolia** | `0xA52b...9aF5` | [Etherscan](https://sepolia.etherscan.io/address/0xA52bD90D699D00781F6610631E22703526c69aF5) |
| **Monad Testnet** | `0xD7DE...738b` | Explorer |

## 🎯 Use Cases

1. **Scheduled Announcements** - Reveal messages at specific times
2. **Time Capsules** - Send messages to your future self
3. **Surprise Messages** - Birthday/anniversary messages that unlock on the date
4. **Sealed Bids** - Time-locked bidding systems
5. **Timed Reveals** - NFT reveals, game mechanics, etc.

## 🔐 How It Works

1. **Connect Wallet** - Use MetaMask or any Web3 wallet
2. **Select Network** - Choose Base Sepolia or Sepolia
3. **Set Unlock Time** - Pick when the message should unlock
4. **Write Message** - Enter your encrypted message
5. **Send** - Message is stored on-chain, encrypted
6. **Wait** - Message unlocks automatically at the specified time
7. **Read** - Receiver clicks to read after unlock time

## 📸 Screenshots

### Main Interface
![Main Interface](./docs/screenshots/main.png)

### Network Switcher
![Network Switcher](./docs/screenshots/networks.png)

### Message Form
![Message Form](./docs/screenshots/form.png)

## 🗺️ Roadmap

- [x] Core time-locked messaging
- [x] Multi-chain support (Base, Sepolia)
- [x] Farcaster Mini App integration
- [x] English localization
- [ ] Base Mainnet deployment
- [ ] Message hiding/unhiding
- [ ] IPFS storage for long messages
- [ ] Mobile app (React Native)
- [ ] Group messages
- [ ] Message scheduling UI
- [ ] Analytics dashboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📚 Documentation

- [Farcaster Mini App Guide](./FARCASTER_MINIAPP.md)
- [Deployment Checklist](./FARCASTER_DEPLOYMENT_CHECKLIST.md)
- [Multi-Chain Guide](./MULTICHAIN_GUIDE.md)
- [Contract Documentation](./contracts/)

## 🐛 Known Issues

- Manifest requires public HTTPS access for Farcaster
- Some testnets may have RPC instability
- MetaMask popup may require manual triggering

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Base](https://base.org) for L2 infrastructure
- [Farcaster](https://farcaster.xyz) for social protocol
- [Zama](https://zama.ai) for FHE technology inspiration
- [RainbowKit](https://rainbowkit.com) for wallet UI
- [wagmi](https://wagmi.sh) for React hooks

## 📞 Contact

- **Website**: [zama.minen.com.tr](https://zama.minen.com.tr)
- **GitHub**: [@Madmin27](https://github.com/Madmin27)
- **Farcaster**: Share on Warpcast!

---

**Built with ❤️ for the Base and Farcaster communities**

*Last Updated: October 2025*
