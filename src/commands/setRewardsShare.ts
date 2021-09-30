import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK } from "../global";
import * as st from '@saberhq/token-utils';
import { TransactionEnvelope } from '@saberhq/solana-contrib';

export async function setRewardsShare(rewarder: string, stakeToken: string, rewardsShare: string, {
  admin,
  simulate
}: {
  admin?: string,
  simulate: boolean
}) {
  let adminPubkey: anchor.web3.PublicKey | undefined;
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

  const rewarderPubkey = new anchor.web3.PublicKey(rewarder);
  const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(rewarderPubkey);
  const stakeTokenInfo = st.Token.fromMint(stakeToken, 9);

  const quarryWrapper = await rewarderWrapper.getQuarry(stakeTokenInfo);

  const tx = new TransactionEnvelope(quarryWrapper.provider, [
    quarryWrapper.program.instruction.setRewardsShare(
      new anchor.BN(parseInt(rewardsShare)), {
      accounts: {
        auth: {
          authority: adminPubkey || quarryWrapper.provider.wallet.publicKey,
          rewarder: rewarderPubkey,
        },
        quarry: quarryWrapper.key,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
    }),
  ]);


  if (adminKP && !tx.signers.find(s => s.publicKey.equals(adminKP!.publicKey))) {
    tx.addSigners(adminKP)
  }

  console.log("setRewardsShare tx ", (await tx.confirm()).signature);
}