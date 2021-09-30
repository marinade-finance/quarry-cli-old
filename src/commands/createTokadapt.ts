import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
import { TextEncoder } from 'util';
import { connection, tokadaptProgram, TOKADAPT_PROGRAM_ID, walletKeypair } from '../global';
const expandTilde = require('expand-tilde');
import * as token from '@solana/spl-token';

export async function createTokadapt(inputToken: string, outputToken: string, {
  state,
  outputStorage,
  admin,
  outputSource,
  outputSourceOwner,
  outputStartAmount,
  simulate
}: {
  state?: string,
  outputStorage?: string,
  admin?: string,
  outputSource?: string,
  outputSourceOwner?: string,
  outputStartAmount?: string,
  simulate: boolean
}) {
  const inputTokenPubkey = new anchor.web3.PublicKey(inputToken)
  const outputTokenPubkey = new anchor.web3.PublicKey(outputToken)
  const stateKP = state
    ? anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await fs.readFile(expandTilde(state), 'utf-8'))))
    : new anchor.web3.Keypair();
  const outputStorageKP = outputStorage
    ? anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await fs.readFile(expandTilde(outputStorage), 'utf-8'))))
    : new anchor.web3.Keypair();

  const [outputStorageAuthority, outputStorageAuthorityBump] =
    await anchor.web3.PublicKey.findProgramAddress([
      new TextEncoder().encode('storage'), stateKP.publicKey.toBytes()],
      TOKADAPT_PROGRAM_ID);

  let adminPubkey;
  let adminKP: anchor.web3.Keypair | undefined;
  if (admin) {
    try {
      adminPubkey = new anchor.web3.PublicKey(admin);
    } catch (e) {
      adminKP = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(await fs.readFile(expandTilde(admin), 'utf-8'))));
      adminPubkey = adminKP.publicKey;
    }
  } else {
    adminPubkey = walletKeypair!.publicKey;
    adminKP = walletKeypair!;
  }

  const outputSourcePubkey = outputSource
    ? new anchor.web3.PublicKey(outputSource)
    : undefined;
  const outputSourceOwnerKeypair = outputSourceOwner
    ? anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await fs.readFile(expandTilde(outputSourceOwner), 'utf-8'))))
    : walletKeypair!;

  console.log(`Created tokadapt ${stateKP.publicKey.toBase58()} with input mint ${inputTokenPubkey.toBase58()} 
    and output storage ${outputStorageKP.publicKey.toBase58()}.
    Admin is ${adminPubkey}`);

  if (outputSourcePubkey) {
    console.log(`Fill initial output storage from ${outputSourcePubkey.toBase58()} with ${outputStartAmount}`)
  }

  const signers = [walletKeypair!, stateKP, outputStorageKP];
  const transaction = new anchor.web3.Transaction({ feePayer: walletKeypair!.publicKey });

  transaction.add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: walletKeypair!.publicKey,
      newAccountPubkey: outputStorageKP.publicKey,
      lamports: await token.Token.getMinBalanceRentForExemptAccount(connection!),
      space: token.AccountLayout.span,
      programId: token.TOKEN_PROGRAM_ID,
    }),
  );

  transaction.add(token.Token.createInitAccountInstruction(
    token.TOKEN_PROGRAM_ID,
    outputTokenPubkey,
    outputStorageKP.publicKey,
    outputStorageAuthority));

  transaction.add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: walletKeypair!.publicKey,
      newAccountPubkey: stateKP.publicKey,
      lamports: await connection!.getMinimumBalanceForRentExemption(150),
      space: 150, // min 105
      programId: TOKADAPT_PROGRAM_ID,
    })
  )

  transaction.add(
    tokadaptProgram!.instruction.initialize(
      adminPubkey,
      inputTokenPubkey,
      {
        accounts: {
          state: stateKP.publicKey,
          outputStorage: outputStorageKP.publicKey,
        }
      }));

  if (outputSourcePubkey) {
    transaction.add(
      token.Token.createTransferInstruction(
        token.TOKEN_PROGRAM_ID,
        outputSourcePubkey,
        outputStorageKP.publicKey,
        outputSourceOwnerKeypair!.publicKey,
        [],
        new anchor.BN(parseFloat(outputStartAmount!) * anchor.web3.LAMPORTS_PER_SOL
        )))

    if (!signers.find(k => k.publicKey.equals(outputSourceOwnerKeypair!.publicKey))) {
      signers.push(outputSourceOwnerKeypair!)
    }
  }

  if (simulate) {
    console.log((await (connection!.simulateTransaction(transaction, signers))).value.logs)
  } else {
    console.log("tx ", await connection!.sendTransaction(transaction, signers))
  }

  return {
    state: stateKP.publicKey,
    outputStorage: outputStorageKP.publicKey,
    admin: adminPubkey
  }
}