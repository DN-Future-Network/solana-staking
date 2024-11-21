use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::constants::STAKING_SEED;
use crate::errors::StakingError;
use crate::state::StakingInfo;

pub fn deposit_reward(ctx: Context<DepositReward>, amount: u64) -> Result<()> {
    let staking_info = &mut ctx.accounts.staking_info;
    if staking_info.authority != ctx.accounts.admin.key() {
        msg!("staking pool authority: {}", staking_info.authority);
        msg!("admin address: {}", ctx.accounts.admin.key());
        return Err(StakingError::Unauthorized.into());
    }

    // Transfer token to staking vault
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.from_associated_token_account.to_account_info().clone(),
        mint: ctx.accounts.mint_account.to_account_info().clone(),
        to: ctx.accounts.staking_vault.to_account_info().clone(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    transfer_checked(cpi_context, amount, ctx.accounts.mint_account.decimals)?;
    msg!("Admin deposit successfully.");

    Ok(())
}

#[derive(Accounts)]
pub struct DepositReward<'info> {
    #[account(mut)]
    pub mint_account: InterfaceAccount<'info, Mint>,

    // #[account(
    //     mut,
    //     associated_token::mint = mint_account,
    //     associated_token::authority = from_authority,
    // )]
    #[account(mut)]
    pub from_associated_token_account: InterfaceAccount<'info, TokenAccount>,

    // #[account(constraint = admin.key() == from_authority.key())]
    // pub from_authority: Signer<'info>,

    #[account(mut)]
    pub staking_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [STAKING_SEED],
        bump
    )]
    pub staking_info: Box<Account<'info, StakingInfo>>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
