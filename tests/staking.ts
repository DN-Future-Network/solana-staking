import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { assert, expect } from "chai";

import {
  BanksClient,
  Clock,
  ProgramTestContext,
  startAnchor,
} from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { Token } from "../target/types/token";
import { Staking } from "../target/types/staking";

const IDL_TOKEN_2022 = require("../target/idl/token.json");
const PROGRAM_TOKEN_2022_ID = new PublicKey(IDL_TOKEN_2022.address);

const IDL_STAKING = require("../target/idl/staking.json");
const PROGRAM_STAKING_ID = new PublicKey(IDL_STAKING.address);

const TOKEN_DECIMAL = 6;
const TOKEN_100 = new BN(100).mul(new BN(10 ** TOKEN_DECIMAL));
const TOKEN_500 = new BN(500).mul(new BN(10 ** TOKEN_DECIMAL));
const TOKEN_1000 = new BN(1000).mul(new BN(10 ** TOKEN_DECIMAL));

const STAKING_SEED = "STAKING_SEED";
const STAKING_VAULT = "STAKING_VAULT";
const USER_SEED = "USER_SEED";

const DURATION_1_DAY = new BN(1000).mul(new BN(60 * 60 * 24));
const STAKING_START_TIME = new BN(Date.now()).add(DURATION_1_DAY);
const STAKING_END_TIME = STAKING_START_TIME.add(DURATION_1_DAY);
const STAKING_INTEREST_RATE = new BN(1000); // 10%
const STAKING_MAX_DEPOSIT_AMOUNT_PER_USER = TOKEN_1000;

describe("staking", async () => {
  let admin: Keypair;
  let user1: Keypair;

  let mint: PublicKey;
  let ATA_user1: PublicKey;
  let ATA_admin: PublicKey;

  let PDA_stakingInfo: PublicKey;
  let PDA_stakingInfo_bump: number;
  let ATA_stakingVault: PublicKey;

  let programStaking: Program<Staking>;
  let programToken: Program<Token>;

  let context: ProgramTestContext;
  let banksClient: BanksClient;
  let connection: Connection;

  before(async () => {
    admin = new Keypair();
    user1 = new Keypair();

    // Configure the client to use the local cluster.
    context = await startAnchor(
      "",
      [
        { name: "staking", programId: PROGRAM_STAKING_ID },
        { name: "token", programId: PROGRAM_TOKEN_2022_ID },
      ],
      [
        {
          address: admin.publicKey,
          info: {
            lamports: 1_000_000_000,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
        {
          address: user1.publicKey,
          info: {
            lamports: 1_000_000_000,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
      ]
    );

    banksClient = context.banksClient;
    const provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    connection = provider.connection;
    programStaking = new anchor.Program<Staking>(IDL_STAKING, provider);
    programToken = new anchor.Program<Token>(IDL_TOKEN_2022, provider);

    // Create token contract
    mint = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("token-2022-token"),
        admin.publicKey.toBytes(),
        Buffer.from("Test token"),
      ],
      programToken.programId
    )[0];
    await programToken.methods
      .createToken("Test token")
      .accounts({
        signer: admin.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    // Create associated token accounts for admin
    ATA_admin = PublicKey.findProgramAddressSync(
      [
        admin.publicKey.toBytes(),
        TOKEN_2022_PROGRAM_ID.toBytes(),
        mint.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
    await programToken.methods
      .createAssociatedTokenAccount()
      .accounts({
        // @ts-ignore
        tokenAccount: ATA_admin,
        mint: mint,
        signer: admin.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    // Create associated token accounts for user
    ATA_user1 = PublicKey.findProgramAddressSync(
      [
        user1.publicKey.toBytes(),
        TOKEN_2022_PROGRAM_ID.toBytes(),
        mint.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
    await programToken.methods
      .createAssociatedTokenAccount()
      .accounts({
        // @ts-ignore
        tokenAccount: ATA_user1,
        mint: mint,
        signer: user1.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();

    // Mint 1000 tokens for admin
    await programToken.methods
      .mintToken(TOKEN_1000)
      .accounts({
        mint: mint,
        signer: admin.publicKey,
        receiver: ATA_admin,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    // Mint 500 tokens for user1
    await programToken.methods
      .mintToken(TOKEN_500)
      .accounts({
        mint: mint,
        signer: admin.publicKey,
        receiver: ATA_user1,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    // Get PDA accounts of staking pool
    [PDA_stakingInfo, PDA_stakingInfo_bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(STAKING_SEED)],
      programStaking.programId
    );
    ATA_stakingVault = PublicKey.findProgramAddressSync(
      [Buffer.from(STAKING_VAULT), PDA_stakingInfo.toBuffer(), mint.toBuffer()],
      programStaking.programId
    )[0];
  });

  describe("createStakingPool", async () => {
    it("Create successfully", async () => {
      await programStaking.methods
        .createStakingPool(
          STAKING_MAX_DEPOSIT_AMOUNT_PER_USER,
          STAKING_INTEREST_RATE.toNumber(),
          STAKING_START_TIME,
          STAKING_END_TIME
        )
        .accounts({
          mintAccount: mint,
          admin: admin.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([admin])
        .rpc();

      const stakingInfo = await connection.getAccountInfo(PDA_stakingInfo);
      expect(stakingInfo.owner.equals(programStaking.programId)).to.be.true;

      const stakingInfoData = await programStaking.account.stakingInfo.fetch(
        PDA_stakingInfo
      );
      expect(stakingInfoData.tokenMintAddress.equals(mint)).to.be.true;
      expect(stakingInfoData.isPaused).to.be.false;
      expect(stakingInfoData.authority.equals(admin.publicKey)).to.be.true;
      expect(
        stakingInfoData.maxTokenAmountPerAddress.eq(
          STAKING_MAX_DEPOSIT_AMOUNT_PER_USER
        )
      ).to.be.true;
      expect(stakingInfoData.interestRate).to.equal(
        STAKING_INTEREST_RATE.toNumber()
      );
      expect(stakingInfoData.startTime.eq(STAKING_START_TIME)).to.be.true;
      expect(stakingInfoData.endTime.eq(STAKING_END_TIME)).to.be.true;

      const stakingVault = await getAccount(
        connection,
        ATA_stakingVault,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      expect(stakingVault.owner.equals(PDA_stakingInfo)).to.be.true;

      const accountsData = {
        mintAccount: mint,
        admin: admin.publicKey,
        fromAssociatedTokenAccount: ATA_admin,
        stakingInfo: PDA_stakingInfo,
        stakingVault: ATA_stakingVault,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      };

      await programStaking.methods
        .depositReward(TOKEN_1000)
        .accounts(accountsData)
        .signers([admin])
        .rpc();
    });
  });

  describe("deposit", async () => {
    it("Deposit successfully", async () => {
      const PDA_user1 = PublicKey.findProgramAddressSync(
        [Buffer.from(USER_SEED), user1.publicKey.toBuffer()],
        programStaking.programId
      )[0];
      const accountsData = {
        mintAccount: mint,
        staker: user1.publicKey,
        fromAssociatedTokenAccount: ATA_user1,
        stakingInfo: PDA_stakingInfo,
        stakingVault: ATA_stakingVault,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      };

      const ATA_user1_before = await getAccount(
        connection,
        ATA_user1,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const ATA_stakingVault_before = await getAccount(
        connection,
        ATA_stakingVault,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      // Set current time to start time
      const currentClock = await banksClient.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(STAKING_START_TIME.toString())
        )
      );
      await programStaking.methods
        .deposit(TOKEN_100)
        .accounts(accountsData)
        .signers([user1])
        .rpc();

      const ATA_user1_after = await getAccount(
        connection,
        ATA_user1,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const ATA_stakingVault_after = await getAccount(
        connection,
        ATA_stakingVault,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      expect(
        (ATA_user1_before.amount - ATA_user1_after.amount).toString()
      ).to.equal(TOKEN_100.toString());
      expect(
        (
          ATA_stakingVault_after.amount - ATA_stakingVault_before.amount
        ).toString()
      ).to.equal(TOKEN_100.toString());

      const userInfo = await connection.getAccountInfo(PDA_user1);
      expect(userInfo.owner.equals(programStaking.programId)).to.be.true;

      const userInfoData = await programStaking.account.userInfo.fetch(
        PDA_user1
      );

      expect(userInfoData.holder.equals(user1.publicKey)).to.be.true;
      expect(userInfoData.stakedAmount.eq(TOKEN_100)).to.be.true;
      expect(userInfoData.pendingReward.isZero()).to.be.true;
      expect(userInfoData.lastClaimedRewardAt.gte(STAKING_START_TIME)).to.be
        .true;
    });
  });

  describe("withdraw", async () => {
    it("Withdraw successfully", async () => {
      const PDA_user1 = PublicKey.findProgramAddressSync(
        [Buffer.from(USER_SEED), user1.publicKey.toBuffer()],
        programStaking.programId
      )[0];
      const accountsData = {
        mintAccount: mint,
        staker: user1.publicKey,
        toAssociatedTokenAccount: ATA_user1,
        stakingInfo: PDA_stakingInfo,
        stakingVault: ATA_stakingVault,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      };

      const ATA_user1_before = await getAccount(
        connection,
        ATA_user1,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const ATA_stakingVault_before = await getAccount(
        connection,
        ATA_stakingVault,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const userInfoData = await programStaking.account.userInfo.fetch(
        PDA_user1
      );
      const stakingInfoData = await programStaking.account.stakingInfo.fetch(
        PDA_stakingInfo
      );
      const elapsed_time = stakingInfoData.endTime
        .sub(userInfoData.lastClaimedRewardAt)
        .div(new BN(1000));
      const reward_expected = userInfoData.stakedAmount
        .mul(STAKING_INTEREST_RATE)
        .mul(elapsed_time)
        .div(new BN(60 * 60 * 24 * 365 * 10000)); //(self.staked_amount as f64) * (((rate * seconds) / 31536000.0));

      // Set current time to start time
      const currentClock = await banksClient.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(STAKING_END_TIME.add(new BN(1)).toString())
        )
      );
      await programStaking.methods
        .withdraw(PDA_stakingInfo_bump)
        .accounts(accountsData)
        .signers([user1])
        .rpc();

      const ATA_user1_after = await getAccount(
        connection,
        ATA_user1,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const ATA_stakingVault_after = await getAccount(
        connection,
        ATA_stakingVault,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      expect(
        (ATA_user1_after.amount - ATA_user1_before.amount).toString()
      ).to.equal(reward_expected.add(userInfoData.stakedAmount).toString());
      expect(
        (
          ATA_stakingVault_before.amount - ATA_stakingVault_after.amount
        ).toString()
      ).to.equal(reward_expected.add(userInfoData.stakedAmount).toString());

      try {
        await connection.getAccountInfo(PDA_user1);
        assert(false, "should've failed but didn't ");
      } catch (err) {
        expect(err.toString()).to.be.equal(
          `Error: Could not find ${PDA_user1}`
        );
      }
    });
  });
});
