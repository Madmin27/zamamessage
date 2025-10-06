#!/bin/bash

echo "🔐 Zama FHE ChronoMessage - Sepolia Deployment Check"
echo "========================================================"
echo ""

# .env dosyasını kontrol et
if [ ! -f .env ]; then
    echo "❌ .env dosyası bulunamadı!"
    echo "   Örnek: cp .env.example .env"
    exit 1
fi

source .env

echo "📋 Yapılandırma Kontrolü:"
echo ""

MISSING=0

# SEPOLIA_RPC_URL kontrolü
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "❌ SEPOLIA_RPC_URL tanımlanmamış!"
    echo "   .env dosyasında SEPOLIA_RPC_URL satırını uncomment edin ve doldurun."
    MISSING=1
else
    echo "✅ SEPOLIA_RPC_URL: ${SEPOLIA_RPC_URL:0:50}..."
    
    # RPC bağlantısını test et
    echo "   Testing connection..."
    RESPONSE=$(curl -s -X POST $SEPOLIA_RPC_URL \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')
    
    if echo "$RESPONSE" | grep -q "0xaa36a7"; then
        echo "   ✅ RPC bağlantısı başarılı! (Chain ID: 11155111 - Sepolia)"
    else
        echo "   ⚠️  RPC yanıt verdi ama Sepolia değil olabilir"
        echo "   Response: $RESPONSE"
    fi
fi

echo ""

# PRIVATE_KEY kontrolü
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY tanımlanmamış!"
    echo "   .env dosyasında PRIVATE_KEY satırını doldurun."
    MISSING=1
else
    echo "✅ PRIVATE_KEY: ${PRIVATE_KEY:0:10}...${PRIVATE_KEY: -4}"
    
    # Private key formatını kontrol et
    if [[ ! $PRIVATE_KEY =~ ^0x[0-9a-fA-F]{64}$ ]]; then
        echo "   ⚠️  Private key formatı yanlış olabilir (64 hex karakter bekleniyor)"
    fi
    
    # Adres ve bakiye kontrolü
    if [ ! -z "$SEPOLIA_RPC_URL" ]; then
        echo "   Checking balance..."
        
        # ethers.js ile adres hesapla
        ADDRESS=$(node -e "
        const ethers = require('ethers');
        const wallet = new ethers.Wallet('$PRIVATE_KEY');
        console.log(wallet.address);
        " 2>/dev/null)
        
        if [ ! -z "$ADDRESS" ]; then
            echo "   Address: $ADDRESS"
            
            # Bakiye kontrolü
            BALANCE_HEX=$(curl -s -X POST $SEPOLIA_RPC_URL \
                -H "Content-Type: application/json" \
                -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$ADDRESS\",\"latest\"],\"id\":1}" \
                | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
            
            if [ ! -z "$BALANCE_HEX" ]; then
                # Hex to decimal conversion
                BALANCE_WEI=$(printf "%d" $BALANCE_HEX 2>/dev/null || echo "0")
                BALANCE_ETH=$(echo "scale=6; $BALANCE_WEI / 1000000000000000000" | bc 2>/dev/null || echo "0")
                
                echo "   Balance: $BALANCE_ETH Sepolia ETH"
                
                # Minimum bakiye kontrolü (0.05 ETH önerilir)
                if (( $(echo "$BALANCE_ETH < 0.05" | bc -l) )); then
                    echo "   ⚠️  Düşük bakiye! En az 0.05 ETH önerilir (FHE deployment için)."
                    echo "   Faucet: https://sepoliafaucet.com/"
                    echo "   Faucet: https://faucets.chain.link/sepolia"
                else
                    echo "   ✅ Bakiye yeterli!"
                fi
            fi
        fi
    fi
fi

echo ""

# ETHERSCAN_API_KEY kontrolü (opsiyonel)
if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "⚠️  ETHERSCAN_API_KEY tanımlanmamış (opsiyonel)"
    echo "   Contract verification için gerekli."
    echo "   Alın: https://etherscan.io/register"
else
    echo "✅ ETHERSCAN_API_KEY: ${ETHERSCAN_API_KEY:0:10}...${ETHERSCAN_API_KEY: -4}"
fi

echo ""

# Zama FHE paketlerini kontrol et
echo "📦 Zama FHE Paketleri:"
if [ -f package.json ]; then
    if grep -q "@fhevm/solidity" package.json; then
        echo "✅ @fhevm/solidity yüklü"
    else
        echo "❌ @fhevm/solidity eksik!"
        echo "   npm install @fhevm/solidity"
        MISSING=1
    fi
    
    if grep -q "@fhevm/hardhat-plugin" package.json; then
        echo "✅ @fhevm/hardhat-plugin yüklü"
    else
        echo "❌ @fhevm/hardhat-plugin eksik!"
        echo "   npm install @fhevm/hardhat-plugin"
        MISSING=1
    fi
else
    echo "❌ package.json bulunamadı!"
    MISSING=1
fi

echo ""

# Contract kontrolü
echo "📄 Smart Contract:"
if [ -f contracts/ChronoMessageZama.sol ]; then
    echo "✅ ChronoMessageZama.sol mevcut"
    
    # Contract'ı compile et
    echo "   Compiling contract..."
    COMPILE_OUTPUT=$(npx hardhat compile 2>&1)
    if echo "$COMPILE_OUTPUT" | grep -q "Compiled.*successfully"; then
        echo "   ✅ Contract başarıyla derlendi"
    else
        echo "   ❌ Compilation hatası:"
        echo "$COMPILE_OUTPUT" | grep -i error | head -5
        MISSING=1
    fi
else
    echo "❌ ChronoMessageZama.sol bulunamadı!"
    MISSING=1
fi

echo ""
echo "========================================"

if [ $MISSING -eq 1 ]; then
    echo "❌ Eksik yapılandırmalar var!"
    echo ""
    echo "Düzeltmek için:"
    echo "  1. nano .env  (RPC URL ve Private Key ekleyin)"
    echo "  2. npm install  (Zama FHE paketlerini yükleyin)"
    echo ""
    echo "Detaylı rehber:"
    echo "  cat ZAMA_TESTNET.md"
    exit 1
else
    echo "✅ Tüm kontroller başarılı!"
    echo ""
    echo "🚀 Deploy için hazırsınız:"
    echo "  npx hardhat run scripts/deploy-zama.ts --network sepolia"
    echo ""
    echo "📚 Zama FHE Özellikleri:"
    echo "  - Encryption: euint256 (256-bit FHE)"
    echo "  - Gateway: https://gateway.sepolia.zama.ai"
    echo "  - Access Control: FHE.allow() based"
    echo ""
    echo "📖 Tam rehber: ZAMA_TESTNET.md"
fi

echo ""
