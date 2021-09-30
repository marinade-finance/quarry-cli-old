import { Command } from "commander";
import * as quarry from '@quarryprotocol/quarry-sdk';
import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK } from "../global";
import * as st from '@saberhq/token-utils';
import { TransactionEnvelope } from "@saberhq/solana-contrib";
import { setRewardsShare } from "./setRewardsShare";

export async function createQuarry(rewarder: string, stakeToken: string, {
  admin,
  rewardsShare,
  simulate
}: {
  admin?: string,
  rewardsShare?: string,
  simulate: boolean
}) {
  const rewarderPubkey = new anchor.web3.PublicKey(rewarder);
  const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(rewarderPubkey);

  let adminKP = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(await fs.readFile(expandTilde(admin), 'utf-8'))));

  const stakeTokenInfo = st.Token.fromMint(stakeToken, 9);

  const {
    quarry,
    tx
  } = await rewarderWrapper.createQuarry({
    token: stakeTokenInfo,
    authority: adminKP.publicKey
  });

  // Fix a bug
  if (!tx.signers.find(s => s.publicKey.equals(adminKP.publicKey))) {
    tx.addSigners(adminKP)
  }

  if (simulate) {
    console.log((await tx.simulate()).value.logs);
  } else {
    console.log("tx ", (await tx.confirm()).signature);

    if (rewardsShare) {
      await setRewardsShare(rewarder, stakeToken, rewardsShare, { admin, simulate })
    }
  }

  return {
    quarry
  }
}