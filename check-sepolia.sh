#!/bin/bash

echo "🔍 Sepolia Deployment Hazırlık Kontrolü"
echo "========================================"
echo ""

# .env dosyasını kontrol et
if [ ! -f .env ]; then
    echo "❌ .env dosyası bulunamadı!"
    exit 1
fi

source .env

echo "📋 Yapılandırma Kontrolü:"
echo ""

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
        echo "   ✅ RPC bağlantısı başarılı! (Chain ID: 11155111)"
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
    
    # Private key'den adres çıkar ve bakiye kontrol et
    if [ ! -z "$SEPOLIA_RPC_URL" ]; then
        ADDRESS=$(npx hardhat console --network sepolia <<EOF 2>/dev/null | grep "0x" | head -1
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
console.log(wallet.address);
.exit
EOF
)
        if [ ! -z "$ADDRESS" ]; then
            echo "   Address: $ADDRESS"
            
            # Bakiye kontrolü
            BALANCE_HEX=$(curl -s -X POST $SEPOLIA_RPC_URL \
                -H "Content-Type: application/json" \
                -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$ADDRESS\",\"latest\"],\"id\":1}" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
            
            if [ ! -z "$BALANCE_HEX" ]; then
                BALANCE_WEI=$(printf "%d" $BALANCE_HEX 2>/dev/null || echo "0")
                BALANCE_ETH=$(echo "scale=6; $BALANCE_WEI / 1000000000000000000" | bc 2>/dev/null || echo "0")
                
                echo "   Balance: $BALANCE_ETH Sepolia ETH"
                
                if (( $(echo "$BALANCE_ETH < 0.01" | bc -l) )); then
                    echo "   ⚠️  Düşük bakiye! En az 0.01 ETH önerilir."
                    echo "   Faucet: https://sepoliafaucet.com/"
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
echo "========================================"

if [ ! -z "$MISSING" ]; then
    echo "❌ Eksik yapılandırmalar var!"
    echo ""
    echo "Düzeltmek için:"
    echo "  nano .env"
    echo ""
    echo "Detaylı rehber:"
    echo "  cat SEPOLIA_QUICKSTART.md"
    exit 1
else
    echo "✅ Tüm kontroller başarılı!"
    echo ""
    echo "🚀 Deploy için hazırsınız:"
    echo "  npx hardhat run scripts/deploy.ts --network sepolia"
fi

echo ""
