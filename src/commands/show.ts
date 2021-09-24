import * as anchor from '@project-serum/anchor';
import { findMinterAddress } from '@quarryprotocol/quarry-sdk';
import { TransactionEnvelope } from '@saberhq/solana-contrib';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK, walletKeypair } from "../global";
import * as st from '@saberhq/token-utils';

function lamportsToString(lamports: anchor.BN): string {
  if (lamports.byteLength() > 7) {
    return "unlimited"
  } else {
    return (lamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toString()
  }
}

export async function showMintWrapper(mintWrapper: string) {
  const mintWrapperData = await quarrySDK!.mintWrapper.fetchMintWrapper(
    new anchor.web3.PublicKey(mintWrapper));
  if (!mintWrapperData) {
    throw new Error(`${mintWrapper} is not a mint wrapper`);
  }
  console.log(`Mint wrapper ${mintWrapper}
   base ${mintWrapperData.base}
   bump ${mintWrapperData.bump}
   hard cap ${mintWrapperData.hardCap}
   admin ${mintWrapperData.admin}
   pending admin ${mintWrapperData.pendingAdmin}
   token mint ${mintWrapperData.tokenMint}
   num minters ${mintWrapperData.numMinters}
   total allowance ${lamportsToString(mintWrapperData.totalAllowance)}
   total minted ${lamportsToString(mintWrapperData.totalMinted)}`)
}

export async function showMinter(mintWrapper: string, authority: string) {
  const mintWrapperPubkey = new anchor.web3.PublicKey(mintWrapper);
  const authorityPubkey = new anchor.web3.PublicKey(authority);

  const minterData = await quarrySDK!.mintWrapper.fetchMinter(mintWrapperPubkey, authorityPubkey);
  if (!minterData) {
    throw new Error(`Can not fetch minter for ${mintWrapper} / ${authority}`);
  }

  console.log(`Minter ${(await findMinterAddress(mintWrapperPubkey, authorityPubkey))[0]}
  mintWrapper ${minterData.mintWrapper}
  minterAuthority ${minterData.minterAuthority}
  bump ${minterData.bump}
  index ${minterData.index}
  allowance ${lamportsToString(minterData.allowance)}
  totalMinted ${lamportsToString(minterData.totalMinted)}`)
}

export async function showRewarder(rewarder: string) {
  const rewarderPubkey = new anchor.web3.PublicKey(rewarder)
  const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(rewarderPubkey)
  console.log(`Rewarder ${rewarder}
   base ${rewarderWrapper.rewarderData.base}
   bump ${rewarderWrapper.rewarderData.bump}
   authority ${rewarderWrapper.rewarderData.authority}
   pendingAuthority ${rewarderWrapper.rewarderData.pendingAuthority}
   numQuarries ${rewarderWrapper.rewarderData.numQuarries}
   annualRewardsRate ${lamportsToString(rewarderWrapper.rewarderData.annualRewardsRate)}
   totalRewardsShares ${rewarderWrapper.rewarderData.totalRewardsShares}
   rewardsTokenMint ${rewarderWrapper.rewarderData.rewardsTokenMint}
   claimFeeTokenAccount ${rewarderWrapper.rewarderData.claimFeeTokenAccount}
   maxClaimFeeKbps ${rewarderWrapper.rewarderData.maxClaimFeeKbps}
   pauseAuthority ${rewarderWrapper.rewarderData.pauseAuthority}
   isPaused ${rewarderWrapper.rewarderData.isPaused}`);
   
   await showMintWrapper(rewarderWrapper.rewarderData.mintWrapper.toString())

   await showMinter(rewarderWrapper.rewarderData.mintWrapper.toString(), rewarder)
}

export async function showQuarry(rewarder: string, token: string) {
  const rewarderPubkey = new anchor.web3.PublicKey(rewarder)
  const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(rewarderPubkey)
  const quarryWrapper = await rewarderWrapper.getQuarry(st.Token.fromMint(token, 9));
  console.log(`Quarry ${quarryWrapper.key}
  token ${quarryWrapper.token}
  index ${quarryWrapper.quarryData.index}
  famine ${(quarryWrapper.quarryData.famineTs.byteLength() <= 7)
    ? new Date(quarryWrapper.quarryData.famineTs.toNumber() * 1000)
    : 'unlimited'}
  lastUpdate ${(quarryWrapper.quarryData.lastUpdateTs.byteLength() <= 7)
    ? new Date(quarryWrapper.quarryData.lastUpdateTs.toNumber() * 1000)
    : 'undefined'}
  annualRewardsRate ${lamportsToString(quarryWrapper.computeAnnualRewardsRate())}
  rewardsShare ${quarryWrapper.quarryData.rewardsShare}
  totalTokensDeposited ${lamportsToString(quarryWrapper.quarryData.totalTokensDeposited)}
  numMiners ${quarryWrapper.quarryData.numMiners}`)

  await showRewarder(rewarder)
}

export async function showMiner(rewarder: string, token: string, authority: string) {
  const rewarderPubkey = new anchor.web3.PublicKey(rewarder)
  const rewarderWrapper = await quarrySDK!.mine.loadRewarderWrapper(rewarderPubkey)
  const quarryWrapper = await rewarderWrapper.getQuarry(st.Token.fromMint(token, 9));
  const authorityPubkey = new anchor.web3.PublicKey(authority);
  const miner = await quarryWrapper.getMiner(authorityPubkey);
  if (!miner) {
    throw new Error(`Can not find miner for ${authority}`)
  }

  const rewards = quarryWrapper.payroll.calculateRewardsEarned(
    new anchor.BN(
      Math.round(new Date().getTime() / 1000)),
      miner.balance,
      miner.rewardsPerTokenPaid,
      miner.rewardsEarned
  )

  console.log(`Miner ${await quarryWrapper.getMinerAddress(authorityPubkey)}
  authority ${miner.authority}
  bump ${miner.bump}
  tokenVaultKey ${miner.tokenVaultKey}
  rewardsEarned ${lamportsToString(miner.rewardsEarned)}
  balance ${lamportsToString(miner.balance)}
  index ${miner.index}
  rewards ${lamportsToString(rewards)}`)
  
  await showQuarry(rewarder, token)
}