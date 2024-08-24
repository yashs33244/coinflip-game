"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("YOUR_PROGRAM_ID_HERE");

export function CoinFlip() {
  const [amount, setAmount] = useState(0.1);
  const [side, setSide] = useState("heads");
  const [result, setResult] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const wallet = useWallet();

  const connection = new Connection("https://api.devnet.solana.com");

  const flipCoin = async () => {
    if (!wallet.publicKey) return;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: PROGRAM_ID,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    try {
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "processed");
      setTxSignature(signature);

      // In a real implementation, you'd interact with your smart contract here
      const randomResult = Math.random() < 0.5;
      setResult(randomResult ? "heads" : "tails");

      if (
        (randomResult && side === "heads") ||
        (!randomResult && side === "tails")
      ) {
        // User wins
        const winTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: PROGRAM_ID,
            toPubkey: wallet.publicKey,
            lamports: 2 * amount * LAMPORTS_PER_SOL,
          })
        );
        await wallet.sendTransaction(winTransaction, connection);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="container">
      <h1>Solana Coin Flip</h1>
      <WalletMultiButton />
      {wallet.publicKey && (
        <>
          <div>
            <label>
              Amount (SOL):
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                min="0.1"
                step="0.1"
              />
            </label>
          </div>
          <div>
            <label>
              Side:
              <select value={side} onChange={(e) => setSide(e.target.value)}>
                <option value="heads">Heads</option>
                <option value="tails">Tails</option>
              </select>
            </label>
          </div>
          <button onClick={flipCoin}>Flip Coin</button>
          {result && <p>Result: {result}</p>}
          {txSignature && (
            <p>
              Transaction:{" "}
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Solana Explorer
              </a>
            </p>
          )}
        </>
      )}
    </div>
  );
}
