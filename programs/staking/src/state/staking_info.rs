use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct StakingInfo {
    // Mint address of the stake token
    pub token_mint_address: Pubkey,
    // Total amount of tokens available in the staking pool
    pub deposit_token_amount: u64,
    // Start time of staking pool
    pub start_time: i64,
    // End time of staking pool
    pub end_time: i64,
    // Maximum amount of tokens an address can stake
    pub max_token_amount_per_address: u64,
    // Interest rate (APY) / 10,000 <=> 100%
    pub interest_rate: u16,
    // Staking pool is active
    pub is_paused: bool,
    // Authority of the staking pool
    pub authority: Pubkey,
}
