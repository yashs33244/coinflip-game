import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Solana Coin Flip",
  description: "A simple coin flip game on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
