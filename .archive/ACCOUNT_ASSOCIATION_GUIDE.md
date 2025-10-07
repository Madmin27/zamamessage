# 🔐 Base Mini App Account Association Guide

## Step 1: Ensure farcaster.json is Accessible

Test that your manifest is publicly accessible:

```bash
curl https://zama.minen.com.tr/.well-known/farcaster.json
```

Expected output should include:
```json
{
  "accountAssociation": {
    "header": "",
    "payload": "",
    "signature": ""
  },
  "miniapp": {
    "name": "ChronoMessage",
    ...
  }
}
```

## Step 2: Use Base Build Account Association Tool

1. **Navigate to Base Build**: https://www.base.dev/preview?tab=account

2. **Enter Your Domain**:
   - App URL: `zama.minen.com.tr` (without https://)
   - Click "Submit"

3. **Sign the Manifest**:
   - Click "Verify" button
   - Connect your wallet (MetaMask)
   - Sign the message to generate association

4. **Copy Generated Fields**:
   The tool will generate three values:
   ```json
   {
     "header": "eyJ...",
     "payload": "eyJ...",
     "signature": "MHg..."
   }
   ```

## Step 3: Update farcaster.json

Copy the generated values and update `/frontend/public/.well-known/farcaster.json`:

```json
{
  "accountAssociation": {
    "header": "PASTE_GENERATED_HEADER_HERE",
    "payload": "PASTE_GENERATED_PAYLOAD_HERE",
    "signature": "PASTE_GENERATED_SIGNATURE_HERE"
  },
  "baseBuilder": {
    "allowedAddresses": ["YOUR_WALLET_ADDRESS"]
  },
  ...
}
```

### Example (DO NOT COPY - Generate your own):
```json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjkxNTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMmVmNzkwRGQ3OTkzQTM1ZkQ4NDdDMDUzRURkQUU5NDBEMDU1NTk2In0",
    "payload": "eyJkb21haW4iOiJ6YW1hLm1pbmVuLmNvbS50ciJ9",
    "signature": "MHgxMGQwZGU4ZGYwZDUwZTdmMGIxN2YxMTU2NDI1MjRmZTY0MTUyZGU4ZGU1MWU0MThiYjU4ZjVmZmQxYjRjNDBiNGVlZTRhNDcwNmVmNjhlMzQ0ZGQ5MDBkYmQyMmNlMmVlZGY5ZGQ0N2JlNWRmNzMwYzUxNjE4OWVjZDJjY2Y0MDFj"
  },
  "baseBuilder": {
    "allowedAddresses": ["0x5c728c75f4845Dc19f1107a173268297908aC883"]
  }
}
```

## Step 4: Rebuild and Deploy

```bash
cd /root/zamamessage/frontend
npm run build
sudo systemctl restart chronomessage-frontend
```

## Step 5: Verify

Test the updated manifest:

```bash
curl https://zama.minen.com.tr/.well-known/farcaster.json | jq '.accountAssociation'
```

Should show the generated values (not empty strings).

## Step 6: Test on Warpcast

1. Open Warpcast
2. Create a cast with: `https://zama.minen.com.tr`
3. Wait for Mini App preview to load
4. Click to open - should open in embedded browser (not Chrome)

## Troubleshooting

### Issue: Opens in Chrome Instead of Embedded Browser

**Cause**: Missing or invalid account association

**Solution**:
1. Verify `accountAssociation` fields are not empty
2. Ensure `baseBuilder.allowedAddresses` contains your wallet address
3. Redeploy and wait 5-10 minutes for Base to re-index
4. Try deleting and reposting the cast

### Issue: "Verify" Button Doesn't Appear

**Cause**: Domain not accessible or manifest format invalid

**Solution**:
1. Test: `curl https://zama.minen.com.tr/.well-known/farcaster.json`
2. Validate JSON format
3. Ensure domain is HTTPS
4. Check firewall allows external access

### Issue: Signature Verification Fails

**Cause**: Mismatch between domain in manifest and signed domain

**Solution**:
1. Ensure you entered `zama.minen.com.tr` exactly (no www, no https://)
2. Check `miniapp.homeUrl` matches signed domain
3. Regenerate signature with correct domain

## Required Fields Checklist

- [ ] `accountAssociation.header` - Generated from Base Build tool
- [ ] `accountAssociation.payload` - Generated from Base Build tool
- [ ] `accountAssociation.signature` - Generated from Base Build tool
- [ ] `baseBuilder.allowedAddresses` - Your wallet address
- [ ] `miniapp.version` - Must be "1"
- [ ] `miniapp.name` - App name (max 32 chars)
- [ ] `miniapp.homeUrl` - HTTPS URL
- [ ] `miniapp.iconUrl` - Icon PNG URL (1024x1024)
- [ ] `miniapp.splashImageUrl` - Splash screen image
- [ ] `miniapp.splashBackgroundColor` - Hex color
- [ ] `miniapp.primaryCategory` - One of the allowed categories
- [ ] `miniapp.tags` - Up to 5 tags

## Categories Reference

Valid `primaryCategory` values:
- `social` ✅ (ChronoMessage uses this)
- `games`
- `finance`
- `utility`
- `productivity`
- `health-fitness`
- `news-media`
- `music`
- `shopping`
- `education`
- `developer-tools`
- `entertainment`
- `art-creativity`

## Resources

- [Base Build Account Association Tool](https://www.base.dev/preview?tab=account)
- [Base Mini Apps Docs](https://docs.base.org/mini-apps/)
- [Manifest Schema](https://docs.base.org/mini-apps/core-concepts/manifest)

---

**Last Updated**: October 2025
