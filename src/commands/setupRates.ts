import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import {quarrySDK} from '../global';
import * as st from '@saberhq/token-utils';

const REWARDER = new anchor.web3.PublicKey(
  'J829VB5Fi7DMoMLK7bsVGFM82cRU61BKtiPz9PNFdL7b'
);

const MSOL = new anchor.web3.PublicKey(
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'
);

const MLP = new anchor.web3.PublicKey(
  'LPmSozJJ8Jh69ut2WP3XmVohTjL4ipR18yiCzxrUmVj'
);

export async function setupRates(
  annual: string,
  {
    msol,
    mlp,
    admin,
    simulate,
  }: {
    msol: string;
    mlp: string;
    admin?: string;
    simulate: boolean;
  }
) {
  const adminKP = admin
    ? anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(
          JSON.parse(await fs.readFile(expandTilde(admin), 'utf-8'))
        )
      )
    : undefined;

  const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(REWARDER);

  let tx = await rewarderWrapper.setAnnualRewards({
    newAnnualRate: new anchor.BN(annual),
    authority: adminKP?.publicKey,
  });

  const msolInfo = st.Token.fromMint(MSOL, 9);

  const msolQuarryWrapper = await rewarderWrapper.getQuarry(msolInfo);

  tx.instructions.push(
    msolQuarryWrapper.program.instruction.setRewardsShare(
      new anchor.BN(parseInt(msol)),
      {
        accounts: {
          auth: {
            authority:
              adminKP?.publicKey || msolQuarryWrapper.provider.wallet.publicKey,
            rewarder: REWARDER,
          },
          quarry: msolQuarryWrapper.key,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      }
    )
  );

  const mlpInfo = st.Token.fromMint(MLP, 9);

  const mlpQuarryWrapper = await rewarderWrapper.getQuarry(mlpInfo);

  tx.instructions.push(
    mlpQuarryWrapper.program.instruction.setRewardsShare(
      new anchor.BN(parseInt(mlp)),
      {
        accounts: {
          auth: {
            authority:
              adminKP?.publicKey || mlpQuarryWrapper.provider.wallet.publicKey,
            rewarder: REWARDER,
          },
          quarry: mlpQuarryWrapper.key,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      }
    )
  );

  if (adminKP && !tx.signers.find(s => s.publicKey.equals(adminKP.publicKey))) {
    tx.addSigners(adminKP);
  }

  tx = tx.combine(await rewarderWrapper.syncQuarryRewards([MSOL, MLP]));
  if (simulate) {
    console.log((await tx.simulate()).value.logs);
  } else {
    console.log('tx ', (await tx.confirm()).signature);
  }
}
