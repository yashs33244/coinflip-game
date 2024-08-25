"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as borsh from "borsh";
import { BetHistory } from "./BetHistory";
import { Faucet } from "./Faucet";
import BN from "bn.js";

const PROGRAM_ID = new PublicKey(
  "4MZFNJgsMjHz7DBiMuAMTbKxQL7DEonkmi4hpk5KwwXS"
);
const STATE_ACCOUNT = new PublicKey("YOUR_STATE_ACCOUNT_HERE");

class CoinFlipState {
  is_initialized: boolean;
  total_bets: number;
  total_amount_wagered: number;

  constructor(fields: {
    is_initialized: boolean;
    total_bets: number;
    total_amount_wagered: number;
  }) {
    this.is_initialized = fields.is_initialized;
    this.total_bets = fields.total_bets;
    this.total_amount_wagered = fields.total_amount_wagered;
  }
}

const CoinFlipSchema = new Map([
  [
    CoinFlipState,
    {
      kind: "struct",
      fields: [
        ["is_initialized", "u8"],
        ["total_bets", "u64"],
        ["total_amount_wagered", "u64"],
      ],
    },
  ],
]);

export function CoinFlip() {
  const [amount, setAmount] = useState(0.1);
  const [side, setSide] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [state, setState] = useState<CoinFlipState | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const wallet = useWallet();
  const connection = new Connection("https://api.devnet.solana.com");

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    const accountInfo = await connection.getAccountInfo(STATE_ACCOUNT);
    if (accountInfo) {
      const decodedState = borsh.deserialize(
        CoinFlipSchema,
        CoinFlipState,
        accountInfo.data
      );
      setState(decodedState);
    }
  };

  const flipCoin = async () => {
    if (!wallet.publicKey) return;

    setIsFlipping(true);
    const lamports = amount * LAMPORTS_PER_SOL;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: STATE_ACCOUNT, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.from([
        1,
        ...new BN(lamports).toArray("le", 8),
        side ? 1 : 0,
      ]),
    });

    const transaction = new Transaction().add(instruction);

    try {
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      setTxSignature(signature);
      fetchState();

      // Simulate coin flip animation
      setTimeout(() => {
        const simulatedResult = Math.random() < 0.5;
        setResult(simulatedResult ? "heads" : "tails");
        setIsFlipping(false);
      }, 600);
    } catch (error) {
      console.error("Error:", error);
      setIsFlipping(false);
    }
  };

  return (
    <div className="container">
      <h1>Solana Coin Flip</h1>
      <WalletMultiButton />
      {wallet.publicKey && (
        <div className="coin-flip-container">
          <div className={`coin ${isFlipping ? "flipping" : ""}`}>
            {result || "?"}
          </div>
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
              <select
                value={side ? "heads" : "tails"}
                onChange={(e) => setSide(e.target.value === "heads")}
              >
                <option value="heads">Heads</option>
                <option value="tails">Tails</option>
              </select>
            </label>
          </div>
          <button onClick={flipCoin} disabled={isFlipping}>
            {isFlipping ? "Flipping..." : "Flip Coin"}
          </button>
          {txSignature && (
            <p>
              Transaction: href=
              {`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              <a>View on Solana Explorer</a>
            </p>
          )}
          {state && (
            <div className="stats">
              <div className="stats-item">
                <p>Total Bets</p>
                <p className="stats-value">{state.total_bets.toString()}</p>
              </div>
              <div className="stats-item">
                <p>Total Wagered</p>
                <p className="stats-value">
                  {(state.total_amount_wagered / LAMPORTS_PER_SOL).toFixed(2)}{" "}
                  SOL
                </p>
              </div>
            </div>
          )}
          <Faucet />
          <BetHistory walletPublicKey={wallet.publicKey} />
        </div>
      )}
    </div>
  );
}
