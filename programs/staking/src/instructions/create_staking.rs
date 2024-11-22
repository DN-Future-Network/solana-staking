use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::constants::{RENT_MINIMUM, STAKING_SEED, STAKING_VAULT};
use crate::state::StakingInfo;

// Add the details for a staking pool
pub fn create_staking_pool(
    ctx: Context<CreateStakingPool>,
    max_token_amount_per_address: u64,
    interest_rate: u16,
    start_time: i64,
    end_time: i64,
) -> Result<()> {
    let staking_info = &mut ctx.accounts.staking_info;
    let authority = &ctx.accounts.admin;

    staking_info.token_mint_address = ctx.accounts.mint_account.to_account_info().key();
    staking_info.deposit_token_amount = 0;
    staking_info.start_time = start_time;
    staking_info.end_time = end_time;
    staking_info.max_token_amount_per_address = max_token_amount_per_address;
    staking_info.interest_rate = interest_rate;
    staking_info.is_paused = false;
    staking_info.authority = authority.key();

    msg!(
        "Staking pool has created for token: {}",
        staking_info.token_mint_address
    );

    // transfer Sol to the staking vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.staking_vault.to_account_info(),
            },
        ),
        RENT_MINIMUM,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct CreateStakingPool<'info> {
    #[account(mut)]
    pub mint_account: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = mint_account,
        token::authority = staking_info,
        seeds = [STAKING_VAULT, staking_info.key().as_ref(), mint_account.key().as_ref()],
        bump,
    )]
    pub staking_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        seeds = [STAKING_SEED],
        bump,
        payer = admin,
        space = 8 + std::mem::size_of::<StakingInfo>(),
    )]
    pub staking_info: Box<Account<'info, StakingInfo>>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
