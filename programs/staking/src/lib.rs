use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("n3CrsB6yrBvta7x28AHJhsGz2oXdyVyfn8ZmhYKAmh4");

#[program]
pub mod staking {
    use super::*;

    pub fn create_staking_pool(
        ctx: Context<CreateStakingPool>,
        max_token_amount_per_address: u64,
        interest_rate: u16,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        return create_staking::create_staking_pool(
            ctx,
            max_token_amount_per_address,
            interest_rate,
            start_time,
            end_time,
        );
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        return deposit::deposit(ctx, amount);
    }

    pub fn withdraw(ctx: Context<Withdraw>, bump: u8) -> Result<()> {
        return withdraw::withdraw(ctx, bump);
    }

    pub fn claim_reward(ctx: Context<ClaimReward>, bump: u8) -> Result<()> {
        return withdraw::claim_reward(ctx, bump);
    }

    pub fn deposit_reward(ctx: Context<DepositReward>, amount: u64) -> Result<()> {
        return admin::deposit_reward(ctx, amount);
    }
}
