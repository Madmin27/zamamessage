import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { chronoMessageZamaAbi } from "@/lib/abi-confidential";
import { supportedChains } from "@/lib/chains";

interface RouteContext {
  params: {
    messageId: string;
  };
}

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com')
});

// ✅ Chains.ts'den al
const CONTRACT_ADDRESS = supportedChains.sepolia.zamaContractAddress;

export async function GET(_request: Request, context: RouteContext) {
  const { messageId } = context.params;
  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  try {
    // Contract'tan metadata al (6 parametre: sender, receiver, unlockTime, isUnlocked, conditionMask, requiredPayment)
    const metadata = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: chronoMessageZamaAbi,
      functionName: "getMessageMetadata",
      args: [BigInt(messageId)]
    }) as [`0x${string}`, `0x${string}`, bigint, boolean, number, bigint];

    const [sender, receiver, unlockTime, isUnlocked, conditionMask, requiredPayment] = metadata;

    return NextResponse.json({
      ok: true,
      message: {
        id: messageId,
        sender,
        receiver,
        unlockTime: unlockTime.toString(),
        isUnlocked,
        conditionMask,
        hasTimeCondition: (conditionMask & 0x01) !== 0,
        hasPaymentCondition: (conditionMask & 0x02) !== 0,
        requiredPayment: requiredPayment?.toString() || null
      }
    });
  } catch (err) {
    console.error("message-preview/[id] GET failed", err);
    return NextResponse.json({ error: "Failed to fetch message metadata" }, { status: 500 });
  }
}
