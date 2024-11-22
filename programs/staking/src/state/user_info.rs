use anchor_lang::prelude::*;
use std::cmp::min;

use super::StakingInfo;

#[account]
#[derive(Default)]

pub struct UserInfo {
    pub holder: Pubkey,
    pub staked_amount: u64,
    pub pending_reward: u64,
    pub last_claimed_reward_at: i64,
}

impl UserInfo {
    pub fn accumulated_reward(&self, staking_info: &StakingInfo) -> u64 {
        if self.staked_amount == 0 {
            return 0;
        }

        let min_time = min(Clock::get().unwrap().unix_timestamp, staking_info.end_time);
        if min_time <= self.last_claimed_reward_at {
            return 0;
        }

        let elapsed_time = (min_time - self.last_claimed_reward_at) as u64 / 1000;
        let reward = (self.staked_amount * elapsed_time * (staking_info.interest_rate as u64))
            / (3600 * 24 * 365 * 10000);
        self.pending_reward + reward
    }
}
