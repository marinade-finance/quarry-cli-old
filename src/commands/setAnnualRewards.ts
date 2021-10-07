import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK } from "../global";

export async function setAnnualRewards(rewarder: string, rate: string, {
  admin,
  mint,
  simulate
}: {
  admin?: string,
  mint?: [string]
  simulate: boolean
}) {
  const rewarderPubkey = new anchor.web3.PublicKey(rewarder);

  const adminKP = admin
    ? anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await fs.readFile(expandTilde(admin), 'utf-8'))))
    : undefined;

  const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(rewarderPubkey);

  const tx = await rewarderWrapper.setAnnualRewards({
    newAnnualRate: new anchor.BN(parseFloat(rate) * anchor.web3.LAMPORTS_PER_SOL),
    authority: adminKP?.publicKey
  })

  if (adminKP && !tx.signers.find(s => s.publicKey.equals(adminKP.publicKey))) {
    tx.addSigners(adminKP)
  }

  const updateTX = mint
    ? await rewarderWrapper.syncQuarryRewards(mint.map(s => new anchor.web3.PublicKey(s)))
    : undefined;

  if (simulate) {
    console.log((await tx.simulate()).value.logs);
    if (updateTX) {
      console.log((await updateTX.simulate()).value.logs);
    }
  } else {
    console.log("tx ", (await tx.confirm()).signature);
    if (updateTX) {
      console.log("update tx ", (await updateTX.confirm()).signature);
    }
  }
}