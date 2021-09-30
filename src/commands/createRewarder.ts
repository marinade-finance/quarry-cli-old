import { Command } from "commander";
import * as quarry from '@quarryprotocol/quarry-sdk';
import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK, walletKeypair } from "../global";
import { createMintWrapper } from "./createMintWrapper";
import { setAnnualRewards } from "./setAnnualRewards";
import { findMinterAddress } from "@quarryprotocol/quarry-sdk";


export async function createRewarder(mintWrapper: string, {
  rewarderBase,
  hardcap,
  admin,
  annualRewards,
  simulate,
}: {
  rewarderBase?: string,
  hardcap?: string,
  admin?: string,
  annualRewards?: string,
  simulate: boolean
}) {
  const mintWrapperPubkey = new anchor.web3.PublicKey(mintWrapper);
  
  const baseKP = rewarderBase
    ? anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await fs.readFile(expandTilde(rewarderBase), 'utf-8'))))
    : undefined;

  let adminKP = admin
  ? anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(await fs.readFile(expandTilde(admin), 'utf-8'))))
        : walletKeypair!;

  const hardcapLamports = hardcap
    ? new anchor.BN(parseFloat(hardcap) * anchor.web3.LAMPORTS_PER_SOL)
    : new anchor.BN("18446744073709551615");

  let {
    key: rewarderKey,
    tx
  } = await quarrySDK!.mine.createRewarder({
    mintWrapper: mintWrapperPubkey,
    baseKP,
    authority: adminKP?.publicKey
  })

  console.log(`Creating rewarder ${rewarderKey.toBase58()}`);

  const [minter, minterBump] = await findMinterAddress(
    mintWrapperPubkey,
    rewarderKey,
    quarrySDK!.mintWrapper.program.programId
  );
  const newMinterInstruction = quarrySDK!.mintWrapper.program.instruction.newMinter(minterBump, {
    accounts: {
      auth: {
        mintWrapper: mintWrapperPubkey,
        admin: adminKP!.publicKey,
      },
      minterAuthority: rewarderKey,
      minter,
      payer: walletKeypair!.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
  });
  newMinterInstruction.keys[1].isWritable = true; // Temporal hack for fixing https://github.com/QuarryProtocol/quarry/issues/101
  tx.instructions.push(newMinterInstruction);

  if (!tx.signers.find(s => s.publicKey.equals(adminKP.publicKey))) {
    tx.addSigners(adminKP)
  }

  const minterUpdateInstruction = quarrySDK!.mintWrapper.program.instruction.minterUpdate(hardcapLamports, {
    accounts: {
      auth: {
        mintWrapper: mintWrapperPubkey,
        admin: adminKP!.publicKey,
      },
      minter,
    },
  });
  minterUpdateInstruction.keys[1].isWritable = true; // Temporal hack for fixing https://github.com/QuarryProtocol/quarry/issues/101
  tx.instructions.push(minterUpdateInstruction);

  /*
  const createMinterTx = await quarrySDK!.mintWrapper
    .newMinterWithAllowance(mintWrapperPubkey, rewarderKey, hardcapLamports);

  tx = tx.combine(createMinterTx);
  */

  if (simulate) {
    console.log((await tx.simulate()).value.logs);
  } else {
    console.log("tx ", (await tx.confirm()).signature);

    if (annualRewards) {
      await setAnnualRewards(rewarderKey.toBase58(), annualRewards, {admin, simulate})
    }
  }

  return {
    rewarder: rewarderKey
  }
}