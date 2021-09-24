import * as anchor from '@project-serum/anchor';
import { TransactionEnvelope } from '@saberhq/solana-contrib';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK, walletKeypair } from "../global";

export async function setAdmin(newAdmin: string, {
  admin,
  mintWrapper,
  rewarder,
  simulate
}: {
  admin?: string,
  mintWrapper?: string,
  rewarder?: string,
  simulate: boolean
}) {
  const adminKP = admin
  ? anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(await fs.readFile(expandTilde(admin), 'utf-8'))))
  : walletKeypair!;

  const newAdminKP = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(await fs.readFile(expandTilde(newAdmin), 'utf-8'))));

  if (mintWrapper) {
    const mintWrapperPubkey = new anchor.web3.PublicKey(mintWrapper);
    let tx = quarrySDK!.mintWrapper.transferAdmin(mintWrapperPubkey, newAdminKP.publicKey);
    tx = tx.combine(quarrySDK!.mintWrapper.acceptAdmin(mintWrapperPubkey));
    if (!tx.signers.find(s => s.publicKey.equals(adminKP.publicKey))) {
      tx.addSigners(adminKP)
    }

    if (!tx.signers.find(s => s.publicKey.equals(newAdminKP.publicKey))) {
      tx.addSigners(newAdminKP)
    }

    if (simulate) {
      console.log((await tx.simulate()).value.logs);
    } else {
      console.log("Set mint wrapper admin tx ", (await tx.confirm()).signature);
    }
  }
  if (rewarder) {
    const rewarderPubkey = new anchor.web3.PublicKey(rewarder);

    const transferAuthorityInstruction = quarrySDK!.mine.program.instruction.transferAuthority(newAdminKP.publicKey, {
      accounts: {
        authority: adminKP.publicKey,
        rewarder: rewarderPubkey,
      },
    });

    const acceptAuthorityInstruction = quarrySDK!.mine.program.instruction.acceptAuthority({
      accounts: {
        authority: newAdminKP.publicKey,
        rewarder: rewarderPubkey,
      },
    })

    const tx = new TransactionEnvelope(quarrySDK!.provider,
      [transferAuthorityInstruction, acceptAuthorityInstruction])

    if (!tx.signers.find(s => s.publicKey.equals(adminKP.publicKey))) {
      tx.addSigners(adminKP)
    }

    if (!tx.signers.find(s => s.publicKey.equals(newAdminKP.publicKey))) {
      tx.addSigners(newAdminKP)
    }

    if (simulate) {
      console.log((await tx.simulate()).value.logs);
    } else {
      console.log("Set rewarder admin tx ", (await tx.confirm()).signature);
    }
  }
}