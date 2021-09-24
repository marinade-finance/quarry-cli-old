import * as quarry from '@quarryprotocol/quarry-sdk';
import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
import { Wallet, SignerWallet, SolanaProvider, TransactionEnvelope } from '@saberhq/solana-contrib';
import { Command } from 'commander';
const expandTilde = require('expand-tilde');

export let connection: anchor.web3.Connection | undefined;
export let wallet: Wallet | undefined;
export let walletKeypair: anchor.web3.Keypair | undefined;
export let quarrySDK: quarry.QuarrySDK | undefined;

export async function setup(command: Command) {
  connection = new anchor.web3.Connection(
    anchor.web3.clusterApiUrl(command.opts().cluster),
    command.opts().commitment)

  walletKeypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(await fs.readFile(expandTilde(command.opts().keypair), 'utf-8'))));

  wallet = new SignerWallet(walletKeypair)

  quarrySDK = quarry.QuarrySDK.load({
    provider: SolanaProvider.load({
      connection: connection,
      sendConnection: connection,
      wallet,
      opts: anchor.Provider.defaultOptions(),
    }),
  });
}