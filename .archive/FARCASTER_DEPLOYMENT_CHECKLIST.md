# 🚀 Farcaster Mini App Deployment Checklist

## ✅ Completed Steps

### 1. Manifest Configuration
- ✅ Created `/public/manifest.json`
- ✅ Added app metadata (name, description, version)
- ✅ Configured supported networks (Base Sepolia, Ethereum Sepolia)
- ✅ Added author and social links

### 2. Visual Assets
- ✅ Created app icon (512x512px)
  - `/public/icon.svg` (vector)
  - `/public/icon.png` (raster)
- ✅ Lock + time indicator design
- ✅ Gradient theme (indigo → cyan)

### 3. Metadata Integration
- ✅ Added metadataBase in layout.tsx
- ✅ Open Graph tags for social sharing
- ✅ Twitter Card configuration
- ✅ Farcaster Frame support

### 4. Frame Preview
- ✅ Created `/public/frame.html`
- ✅ Farcaster Frame meta tags
- ✅ Interactive button configuration

## 📋 Pre-Deployment Checklist

Before sharing on Farcaster, ensure:

### Domain Accessibility
- [ ] https://zama.minen.com.tr is publicly accessible
- [ ] SSL certificate is valid
- [ ] No firewall blocking external access
- [ ] DNS records properly configured

### File Accessibility Tests
Run these commands to verify:

```bash
# Test manifest
curl https://zama.minen.com.tr/manifest.json

# Test icon
curl -I https://zama.minen.com.tr/icon.png

# Test main page
curl -I https://zama.minen.com.tr

# Test frame
curl https://zama.minen.com.tr/frame.html
```

All should return `200 OK` status.

### Firewall Configuration
If using UFW or iptables:

```bash
# Allow HTTPS
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Check status
sudo ufw status
```

### Nginx/Apache Configuration
Ensure static files are served:

```nginx
location /manifest.json {
    add_header Access-Control-Allow-Origin *;
    add_header Content-Type application/json;
}

location ~* \.(png|svg|ico)$ {
    add_header Access-Control-Allow-Origin *;
}
```

## 🧪 Testing on Farcaster

### Step 1: Test Locally
```bash
# Check if Next.js serves the files
curl http://localhost:3000/manifest.json
curl -I http://localhost:3000/icon.png
```

### Step 2: Test Production
```bash
# Replace with your actual domain
curl https://zama.minen.com.tr/manifest.json
```

### Step 3: Warpcast Testing
1. Open Warpcast app or web
2. Create a new cast
3. Paste: `https://zama.minen.com.tr`
4. Wait for preview to load
5. You should see the Mini App card with:
   - App name: "ChronoMessage"
   - Description
   - Icon
   - "Open" button

### Step 4: Verify Mini App Opens
- Click the cast preview
- Should open in Warpcast's embedded browser
- Wallet connect should work
- Network switching should work

## 🔍 Validation Tools

### Farcaster Frame Validator
- [Frame Validator](https://warpcast.com/~/developers/frames)
- Paste your URL to test

### Open Graph Checker
- [OpenGraph.xyz](https://www.opengraph.xyz/)
- Enter: https://zama.minen.com.tr
- Verify preview looks correct

### Twitter Card Validator
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Test social sharing preview

## 📊 Expected Manifest Output

```json
{
  "name": "ChronoMessage",
  "description": "Time-locked encrypted messages on Base...",
  "icon": "https://zama.minen.com.tr/icon.png",
  "url": "https://zama.minen.com.tr",
  "networks": [
    {
      "chainId": "eip155:84532",
      "name": "Base Sepolia"
    },
    {
      "chainId": "eip155:11155111",
      "name": "Sepolia"
    }
  ],
  "version": "1.0.0"
}
```

## 🐛 Troubleshooting

### Manifest Not Loading
- Check CORS headers
- Verify file permissions (644)
- Check Content-Type: application/json
- Clear browser cache

### Icon Not Showing
- Verify icon.png exists in /public
- Check file size (should be < 1MB)
- Test direct URL access
- Try both .png and .svg

### Mini App Not Rendering
- Verify domain is HTTPS (not HTTP)
- Check if domain is publicly accessible
- Test manifest structure with JSON validator
- Wait a few minutes (Farcaster caches)

### Network Not Supported
- Verify chainId format: `eip155:CHAIN_ID`
- Base Sepolia: `eip155:84532`
- Ethereum Sepolia: `eip155:11155111`
- Check user's wallet is on correct network

## 🎯 Next Steps After Deployment

1. **Share First Cast**
   ```
   Just launched ChronoMessage on Base! 🔒⏰
   
   Send time-locked messages that can only be read after a specific time.
   
   Try it: https://zama.minen.com.tr
   
   #Base #Farcaster #Web3
   ```

2. **Monitor Analytics**
   - Track Mini App opens
   - Monitor transaction success rates
   - Gather user feedback

3. **Iterate**
   - Add screenshot.png for better preview
   - Optimize loading time
   - Add more networks (Base mainnet)
   - Improve mobile UX

4. **Community Building**
   - Engage with users on Farcaster
   - Share use cases and examples
   - Create tutorials and guides

## 📚 Resources

- [Base Mini Apps Docs](https://docs.base.org/mini-apps/)
- [Farcaster Frames Spec](https://docs.farcaster.xyz/reference/frames/spec)
- [Warpcast Developer Portal](https://warpcast.com/~/developers)
- [EIP-155 Chain IDs](https://chainid.network/)

---

**Current Status**: ✅ Code ready | ⏳ Awaiting public deployment

**Git Commit**: f3f803b

**Last Updated**: 2025-10-07
