import * as anchor from "@coral-xyz/anchor";
import { Command } from "commander";
import { getKeypairFromFile, makeTokenMint } from "@solana-developers/helpers";
const program = new Command();

require("dotenv").config();

/* ========================================================== */
/* ======================= INTERFACE ======================== */
/* ========================================================== */

interface CreateTokenOptions {
  name: string;
  symbol: string;
  decimals: number;
}

/* ========================================================== */
/* ===================== MAIN FUNCTIONS ===================== */
/* ========================================================== */

// Usage: node -r ts-node/register scripts/create.token.ts [options]

program
  .name("create-token")
  .version("v1.0.0")
  .description("Command to create new SPL Token 2022")
  .requiredOption("-n, --name <string>", "Name of token")
  .requiredOption("-s, --symbol <string>", "Symbol of token")
  .option("-d, --decimals <number>", "Decimals", "6")
  .action(async (options: CreateTokenOptions) => {
    try {
      const provider = anchor.AnchorProvider.env();
      anchor.setProvider(provider);
      const connection = provider.connection;
      const signer = await getKeypairFromFile();

      const mint = await makeTokenMint(
        connection,
        signer,
        options.name,
        options.symbol,
        options.decimals,
        null,
        [],
        signer.publicKey,
        signer.publicKey
      );

      console.table({
        Name: options.name,
        Symbol: options.symbol,
        Decimals: options.decimals,
        "Mint Address": mint.toBase58(),
        Authority: signer.publicKey.toString(),
      });
    } catch (error: any) {
      console.error(error);
    }
  });

program.showHelpAfterError("\n(add --help for additional information)");
program.parse();
