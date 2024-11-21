use anchor_lang::prelude::*;

#[constant]
pub const STAKING_SEED: &[u8] = b"STAKING_SEED";
pub const USER_SEED: &[u8] = b"USER_SEED";
pub const STAKING_VAULT: &[u8] = b"STAKING_VAULT";
pub const MINUTE_INTEREST: f64 = 0.05;
pub const RENT_MINIMUM: u64 = 1_000_000;
