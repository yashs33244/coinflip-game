import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

export function Faucet() {
  const [loading, setLoading] = useState(false);
  const wallet = useWallet();
  const connection = new Connection("https://api.devnet.solana.com");

  const requestAirdrop = async () => {
    if (!wallet.publicKey) return;

    setLoading(true);
    try {
      const airdropSignature = await connection.requestAirdrop(
        wallet.publicKey,
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature);
      alert("Airdrop successful! 1 SOL has been added to your wallet.");
    } catch (error) {
      console.error("Airdrop error:", error);
      alert("Error requesting airdrop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={requestAirdrop} disabled={!wallet.publicKey || loading}>
        {loading ? "Requesting..." : "Request 1 SOL"}
      </button>
    </div>
  );
}
