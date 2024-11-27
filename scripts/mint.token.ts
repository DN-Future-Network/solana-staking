import * as anchor from "@coral-xyz/anchor";
import { Command } from "commander";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { PublicKey } from "@solana/web3.js";
import {
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
const program = new Command();

require("dotenv").config();

/* ========================================================== */
/* ======================= INTERFACE ======================== */
/* ========================================================== */

interface MintTokenOptions {
  mintAddress: string;
  receiver: string;
  amount: number;
}

/* ========================================================== */
/* ===================== MAIN FUNCTIONS ===================== */
/* ========================================================== */

// Usage: node -r ts-node/register scripts/mint.token.ts [options]

program
  .name("mint-token")
  .version("v1.0.0")
  .description("Command to mint token to a destination address")
  .requiredOption(
    "-m, --mint-address <string>",
    "Address of token mint account"
  )
  .requiredOption("-r, --receiver <string>", "Address of receieved token")
  .requiredOption("-a, --amount <string>", "Symbol of token")
  .action(async (options: MintTokenOptions) => {
    try {
      const provider = anchor.AnchorProvider.env();
      anchor.setProvider(provider);
      const connection = provider.connection;
      const signer = await getKeypairFromFile();
      const mint = new PublicKey(options.mintAddress);
      const receiver = new PublicKey(options.receiver);

      const mintAccount = await getMint(
        connection,
        mint,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const tokenDecimals = mintAccount.decimals;
      const bnAmount = BigInt(options.amount) * BigInt(10 ** tokenDecimals);

      const receiverATA = await getOrCreateAssociatedTokenAccount(
        connection,
        signer,
        mint,
        receiver,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const signature = await mintTo(
        connection,
        signer,
        mint,
        receiverATA.address,
        signer,
        bnAmount,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const receiverBalance = await connection.getTokenAccountBalance(
        receiverATA.address
      );
      console.table({
        Balance: receiverBalance.value.uiAmount,
        Tx: `https://solscan.io/tx/${signature}?cluster=devnet`,
      });
    } catch (error: any) {
      console.error(error);
    }
  });

program.showHelpAfterError("\n(add --help for additional information)");
program.parse();
