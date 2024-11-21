use anchor_lang::prelude::*;

#[account]
#[derive(Default)]

pub struct UserInfo {
    pub holder: Pubkey,
    pub staked_amount: u64,
    pub pending_reward: u64,
    pub last_claimed_reward_at: i64,
}

impl UserInfo {
    pub fn accumulated_reward(&self, rate: f64) -> u64 {
        if self.staked_amount == 0 {
            return 0;
        }

        let now = Clock::get().unwrap().unix_timestamp;
        let elapsed_time = (now - self.last_claimed_reward_at) as f64;
        let seconds = elapsed_time / 1000.0;
        let reward = (self.staked_amount as f64) * (((rate * seconds) / 31536000.0));
        self.pending_reward + (reward as u64)
    }
}
