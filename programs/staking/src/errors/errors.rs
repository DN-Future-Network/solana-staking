use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Not allowed")]
    NotAllowed,
    #[msg("Staking not started yet")]
    StakingNotStarted,
    #[msg("Staking already ended")]
    StakingEnded,
    #[msg("Staking not ended yet")]
    StakingNotEnded,
    #[msg("Amount must be greater than zero")]
    TokenAmountTooSmall,
    #[msg("Withdraw amount cannot be less than deposit")]
    TokenAmountTooBig,
    #[msg("Deposit reaches maximum amount")]
    ReachMaxDeposit,
}
