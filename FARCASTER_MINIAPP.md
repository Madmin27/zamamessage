# 🎭 Farcaster Mini App Integration

ChronoMessage is now available as a Farcaster Mini App!

## 📱 What is a Farcaster Mini App?

Farcaster Mini Apps are web applications that can be embedded directly in Farcaster clients (like Warpcast). Users can interact with your dApp without leaving their social feed.

## 🚀 How to Share ChronoMessage on Farcaster

### Method 1: Direct Link Cast
Simply create a cast with the URL:
```
https://zama.minen.com.tr
```

Farcaster will automatically detect the Mini App manifest and render it as an interactive card.

### Method 2: Frame Preview
Share the frame preview page:
```
https://zama.minen.com.tr/frame.html
```

This provides a nice preview before users open the full app.

## 📋 Manifest Details

Our `manifest.json` includes:
- **Name**: ChronoMessage
- **Description**: Time-locked encrypted messages
- **Supported Networks**: 
  - Base Sepolia (testnet)
  - Ethereum Sepolia (testnet)
- **Version**: 1.0.0

## 🔧 Technical Implementation

### Files Created:
- `/public/manifest.json` - Mini App configuration
- `/public/icon.svg` - App icon (SVG)
- `/public/icon.png` - App icon (PNG, 512x512)
- `/public/frame.html` - Farcaster Frame preview page

### Metadata Added:
- Open Graph tags for social sharing
- Twitter Card metadata
- Farcaster Frame tags
- Mini App manifest link

## 🌐 Supported Networks

The app declares support for:
- **Base Sepolia** (`eip155:84532`)
- **Ethereum Sepolia** (`eip155:11155111`)

Users on these networks will see a seamless experience when opening the Mini App from Farcaster.

## 🎨 Visual Elements

- **Icon**: Lock with time indicator (512x512px)
- **Colors**: Gradient from indigo to cyan
- **Theme**: Dark mode optimized

## 📖 Resources

- [Base Mini Apps Documentation](https://docs.base.org/mini-apps/)
- [Farcaster Frames Spec](https://docs.farcaster.xyz/reference/frames/spec)
- [Open Graph Protocol](https://ogp.me/)

## ✅ Verification

Test your Mini App manifest:
```bash
curl https://zama.minen.com.tr/manifest.json
```

Expected response:
```json
{
  "name": "ChronoMessage",
  "description": "Time-locked encrypted messages on Base...",
  "icon": "https://zama.minen.com.tr/icon.png",
  "url": "https://zama.minen.com.tr",
  "networks": [...]
}
```

## 🎯 Next Steps

1. **Deploy to Production**: Ensure zama.minen.com.tr is publicly accessible
2. **Test on Warpcast**: Share the link in a cast
3. **Monitor Usage**: Track Mini App opens and interactions
4. **Iterate**: Gather feedback and improve UX

## 🔐 Security Notes

- All transactions require user approval via MetaMask/wallet
- No private keys are stored
- Contract addresses are network-specific
- Time-lock ensures messages can't be read early

---

Built with ❤️ for the Farcaster community
