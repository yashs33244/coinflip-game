use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{clock::Clock, rent::Rent, Sysvar},
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CoinFlipState {
    pub is_initialized: bool,
    pub total_bets: u64,
    pub total_amount_wagered: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum CoinFlipInstruction {
    Initialize,
    PlaceBet { amount: u64, side: bool }, // true for heads, false for tails
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = CoinFlipInstruction::try_from_slice(instruction_data)?;

    match instruction {
        CoinFlipInstruction::Initialize => initialize(program_id, accounts),
        CoinFlipInstruction::PlaceBet { amount, side } => place_bet(program_id, accounts, amount, side),
    }
}

fn initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let state_account = next_account_info(accounts_iter)?;
    let rent = &Rent::from_account_info(next_account_info(accounts_iter)?)?;

    if !rent.is_exempt(state_account.lamports(), state_account.data_len()) {
        return Err(ProgramError::AccountNotRentExempt);
    }

    let mut state = CoinFlipState::try_from_slice(&state_account.data.borrow())?;
    if state.is_initialized {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    state.is_initialized = true;
    state.total_bets = 0;
    state.total_amount_wagered = 0;
    state.serialize(&mut &mut state_account.data.borrow_mut()[..])?;

    Ok(())
}

fn place_bet(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64, side: bool) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let player = next_account_info(accounts_iter)?;
    let state_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    if !player.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut state = CoinFlipState::try_from_slice(&state_account.data.borrow())?;
    if !state.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    // Transfer the bet amount from the player to the program
    invoke(
        &system_instruction::transfer(player.key, state_account.key, amount),
        &[player.clone(), state_account.clone(), system_program.clone()],
    )?;

    // Determine the result (you may want to use a more sophisticated randomness source in production)
    let clock = Clock::get()?;
    let result = clock.unix_timestamp % 2 == 0;

    // Update state
    state.total_bets += 1;
    state.total_amount_wagered += amount;

    // Determine if the player won
    let player_won = side == result;

    if player_won {
        // Transfer the winnings back to the player (double the bet)
        invoke(
            &system_instruction::transfer(state_account.key, player.key, amount * 2),
            &[state_account.clone(), player.clone(), system_program.clone()],
        )?;
        msg!("Congratulations! You won!");
    } else {
        msg!("Sorry, you lost. Better luck next time!");
    }

    state.serialize(&mut &mut state_account.data.borrow_mut()[..])?;

    Ok(())
}