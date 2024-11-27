import * as anchor from "@coral-xyz/anchor";
import { Command } from "commander";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Staking } from "../target/types/staking";
import { BN } from "bn.js";
const program = new Command();

require("dotenv").config();

/* ========================================================== */
/* ======================== CONSTANTS ======================= */
/* ========================================================== */
const STAKING_SEED = "STAKING_SEED";
const STAKING_VAULT = "STAKING_VAULT";

/* ========================================================== */
/* ======================= INTERFACE ======================== */
/* ========================================================== */

interface CreateStakingPoolOptions {
  token: string;
  maxDeposit: number;
  rate: number;
  startTime: number;
  endTime: number;
}

/* ========================================================== */
/* ===================== MAIN FUNCTIONS ===================== */
/* ========================================================== */

// Usage: node -r ts-node/register scripts/create.staking.pool.ts [options]

program
  .name("create-staking-pool")
  .version("v1.0.0")
  .description("Command to to create new staking pool")
  .requiredOption("-t, --token <string>", "Token that using for deposit")
  .requiredOption(
    "-m, --max-deposit <number>",
    "Max amount of token a user able to deposit"
  )
  .requiredOption("-r, --rate <number>", "Interest rate of pool")
  .requiredOption("-s, --start-time <number>", "Start time of pool (timestamp)")
  .requiredOption("-e, --end-time <number>", "End time of pool (timestamp)")
  .action(async (options: CreateStakingPoolOptions) => {
    try {
      const provider = anchor.AnchorProvider.env();
      anchor.setProvider(provider);
      const connection = provider.connection;
      const signer = await getKeypairFromFile();
      const program = anchor.workspace.Staking as anchor.Program<Staking>;

      const mint = await getMint(
        connection,
        new PublicKey(options.token),
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const tokenDecimals = mint.decimals;
      const maxDeposit = new BN(options.maxDeposit).mul(
        new BN(10 ** tokenDecimals)
      );
      const rate = options.rate;
      const startTime = new BN(options.startTime * 1000);
      const endTime = new BN(options.endTime * 1000);

      const signature = await program.methods
        .createStakingPool(maxDeposit, rate, startTime, endTime)
        .accounts({
          mintAccount: mint.address,
          admin: signer.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([signer])
        .rpc();

      // Get PDA accounts of staking pool
      const PDA_stakingInfo = PublicKey.findProgramAddressSync(
        [Buffer.from(STAKING_SEED)],
        program.programId
      )[0];
      const stakingInfoData = await program.account.stakingInfo.fetch(
        PDA_stakingInfo
      );

      const stakingVaultATA = PublicKey.findProgramAddressSync(
        [
          Buffer.from(STAKING_VAULT),
          PDA_stakingInfo.toBuffer(),
          mint.address.toBuffer(),
        ],
        program.programId
      )[0];
      console.table({
        Token: stakingInfoData.tokenMintAddress.toString(),
        Admin: stakingInfoData.authority.toString(),
        Vault: stakingVaultATA.toString(),
        "Max Deposit": stakingInfoData.maxTokenAmountPerAddress
          .div(new BN(10 ** tokenDecimals))
          .toNumber(),
        Rate: `${stakingInfoData.interestRate / 100}%`,
        "Start Time": new Date(
          stakingInfoData.startTime.toNumber()
        ).toISOString(),
        "End Time": new Date(stakingInfoData.endTime.toNumber()).toISOString(),
        Tx: `https://solscan.io/tx/${signature}?cluster=devnet`,
      });
    } catch (error: any) {
      console.error(error);
    }
  });

program.showHelpAfterError("\n(add --help for additional information)");
program.parse();
