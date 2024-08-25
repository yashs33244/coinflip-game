import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

interface Bet {
  signature: string;
  amount: number;
  result: string;
  timestamp: number;
}

export function BetHistory({
  walletPublicKey,
}: {
  walletPublicKey: PublicKey | null;
}) {
  const [bets, setBets] = useState<Bet[]>([]);
  const connection = new Connection("https://api.devnet.solana.com");

  useEffect(() => {
    if (walletPublicKey) {
      fetchBetHistory();
    }
  }, [walletPublicKey]);

  const fetchBetHistory = async () => {
    if (!walletPublicKey) return;

    const signatures = await connection.getSignaturesForAddress(
      walletPublicKey,
      { limit: 10 }
    );
    const betPromises = signatures.map(async (sig) => {
      const tx = await connection.getTransaction(sig.signature);
      if (tx && tx.meta && tx.meta.logMessages) {
        const resultMessage = tx.meta.logMessages.find(
          (msg) => msg.includes("Player won!") || msg.includes("Player lost!")
        );
        if (resultMessage) {
          return {
            signature: sig.signature,
            amount:
              Math.abs(tx.meta.postBalances[0] - tx.meta.preBalances[0]) /
              LAMPORTS_PER_SOL,
            result: resultMessage.includes("won") ? "Won" : "Lost",
            timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
          };
        }
      }
      return null;
    });

    const betHistory = (await Promise.all(betPromises)).filter(
      (bet): bet is Bet => bet !== null
    );
    setBets(betHistory);
  };

  return (
    <div>
      <h2>Bet History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Result</th>
            <th>Transaction</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => (
            <tr key={bet.signature}>
              <td>{new Date(bet.timestamp).toLocaleString()}</td>
              <td>{bet.amount.toFixed(2)} SOL</td>
              <td>{bet.result}</td>
              <td>
                href=
                {`https://explorer.solana.com/tx/${bet.signature}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                <a>View</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
