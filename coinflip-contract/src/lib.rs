use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CoinFlipState {
    pub is_initialized: bool,
    pub last_flip: bool,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;

    let mut coin_flip_state = CoinFlipState::try_from_slice(&account.data.borrow())?;

    if !coin_flip_state.is_initialized {
        coin_flip_state.is_initialized = true;
    }

    // Simple random number generation (not secure for production)
    let clock = Clock::get()?;
    let random_bool = clock.unix_timestamp % 2 == 0;

    coin_flip_state.last_flip = random_bool;

    coin_flip_state.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!("Coin flip result: {}", if random_bool { "Heads" } else { "Tails" });

    Ok(())
}
