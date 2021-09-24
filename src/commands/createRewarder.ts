import { Command } from "commander";
import * as quarry from '@quarryprotocol/quarry-sdk';
import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK } from "../global";
import { createMintWrapper } from "./createMintWrapper";


export async function createRewarder({
  mintWrapper,
  mint,
  decimals,
  hardcap,
  mintWrapperBase,
  rewarderBase,
  admin,
  annualRewards,
  simulate,
}: {
  mintWrapper?: string,
  mint?: string,
  decimals: string,
  hardcap?: string,
  mintWrapperBase?: string,
  rewarderBase?: string,
  admin?: string,
  annualRewards?: string,
  simulate: boolean
}) {
  let mintWrapperPubkey;
  if (mintWrapper) {
    mintWrapperPubkey = new anchor.web3.PublicKey(mintWrapper);
  } else {
    const {
      mintWrapper: createdMintWrapper
    } = await createMintWrapper({
      mint,
      decimals,
      hardcap,
      mintWrapperBase,
      admin,
      simulate
    })
    mintWrapperPubkey = createdMintWrapper;
  }
  const baseKP = rewarderBase
    ? anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await fs.readFile(expandTilde(rewarderBase), 'utf-8'))))
    : undefined;

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
  }

  const hardcapLamports = hardcap
    ? new anchor.BN(parseFloat(hardcap) * anchor.web3.LAMPORTS_PER_SOL)
    : new anchor.BN("18446744073709551615");

  let {
    key: rewarderKey,
    tx
  } = await quarrySDK!.mine.createRewarder({
    mintWrapper: mintWrapperPubkey,
    baseKP,
    authority: adminPubkey
  })

  const createMinterTx = await quarrySDK!.mintWrapper
    .newMinterWithAllowance(mintWrapperPubkey, rewarderKey, hardcapLamports);

  tx = tx.combine(createMinterTx);

  if (simulate) {
    console.log((await tx.simulate()).value.logs);
  } else {
    console.log("tx ", (await tx.confirm()).signature);

    if (annualRewards) {
      const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(rewarderKey);

      const tx = await rewarderWrapper.setAnnualRewards({
        newAnnualRate: new anchor.BN(parseFloat(annualRewards) * anchor.web3.LAMPORTS_PER_SOL),
        authority: adminKP?.publicKey
      })

      if (adminKP && !tx.signers.find(s => s.publicKey.equals(adminKP!.publicKey))) {
        tx.addSigners(adminKP)
      }

      console.log("setAnnualRewards tx ", (await tx.confirm()).signature);
    }
  }

  return {
    rewarder: rewarderKey
  }
}