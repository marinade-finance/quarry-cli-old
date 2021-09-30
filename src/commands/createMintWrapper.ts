import { Command } from "commander";
import * as quarry from '@quarryprotocol/quarry-sdk';
import * as anchor from '@project-serum/anchor';
import { Wallet, SignerWallet, SolanaProvider, TransactionEnvelope } from '@saberhq/solana-contrib';
import fs from 'mz/fs';
const expandTilde = require('expand-tilde');
import { quarrySDK } from "../global";

export async function createMintWrapper({
  mint,
  decimals,
  hardcap,
  mintWrapperBase,
  admin,
  simulate,
}: {
  mint?: string,
  decimals: string,
  hardcap?: string,
  mintWrapperBase?: string,
  admin?: string,
  simulate: boolean
}) {
  const decimalsInt = parseInt(decimals);
  const hardcapLamports = hardcap
    ? new anchor.BN(parseFloat(hardcap) * anchor.web3.LAMPORTS_PER_SOL)
    : new anchor.BN("18446744073709551615");
  const mintWrapperBaseKP = mintWrapperBase
    ? anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await fs.readFile(expandTilde(mintWrapperBase), 'utf-8'))))
    : undefined;
  let adminPubkey;
  if (admin) {
    try {
      adminPubkey = new anchor.web3.PublicKey(admin);
    } catch (e) {
      adminPubkey = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(await fs.readFile(expandTilde(admin), 'utf-8'))))
        .publicKey;
    }
  }
  let mintPubkey;
  let mintKP;

  if (mint) {
    try {
      mintPubkey = new anchor.web3.PublicKey(mint);
    } catch (e) {
      // It is a keypair
      mintKP = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(await fs.readFile(expandTilde(mint), 'utf-8'))));
    }
  }

  if (mintPubkey) {
    const {
      mintWrapper,
      tx,
    } = await quarrySDK!.mintWrapper.newWrapper({
      hardcap: hardcapLamports,
      tokenMint: mintPubkey,
      baseKP: mintWrapperBaseKP,
      admin: adminPubkey
    });

    try {
      const mintWrapperData = await quarrySDK!.mintWrapper.fetchMintWrapper(mintWrapper)
      if (mintWrapperData) {
        console.log(`Mint wrapper ${mintWrapper} already exists`)
        return {
          mint: mintWrapperData!.tokenMint,
          mintWrapper
        }
      }
    } catch (e) {

    }

    console.log(`Creating mint wrapper ${mintWrapper} for ${mintPubkey} with admin ${adminPubkey || quarrySDK?.provider.wallet.publicKey}`);

    if (simulate) {
      console.log((await tx.simulate()).value.logs);
    } else {
      console.log("tx ", (await tx.confirm()).signature);
    }

    return {
      mint: mintPubkey,
      mintWrapper
    }
  } else {
    const {
      mint: outputMint,
      mintWrapper,
      tx,
    } = await quarrySDK!.mintWrapper.newWrapperAndMint({
      mintKP,
      hardcap: hardcapLamports,
      decimals: decimalsInt,
      baseKP: mintWrapperBaseKP,
      admin: adminPubkey
    })

    try {
      const mintWrapperData = await quarrySDK!.mintWrapper.fetchMintWrapper(mintWrapper)
      if (mintWrapperData) {
        console.log(`Mint wrapper ${mintWrapper} already exists`)
        return {
          mint: mintWrapperData!.tokenMint,
          mintWrapper
        }
      }
    } catch (e) {

    }

    console.log(`Creating mint wrapper ${mintWrapper} with mint ${outputMint} with admin ${adminPubkey || quarrySDK?.provider.wallet.publicKey}`);

    if (simulate) {
      console.log((await tx.simulate()).value.logs);
    } else {
      console.log("tx ", (await tx.confirm()).signature);
    }

    return {
      mint: outputMint,
      mintWrapper
    }
  }
}