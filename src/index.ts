import { Command } from "commander";
import * as quarry from '@quarryprotocol/quarry-sdk';
import * as anchor from '@project-serum/anchor';
import { Wallet, SignerWallet, SolanaProvider, TransactionEnvelope } from '@saberhq/solana-contrib';
import fs from 'mz/fs';
import { setup } from "./global";
import { createMintWrapper } from "./commands/createMintWrapper";
import { createRewarder } from "./commands/createRewarder";
import { setAnnualRewards } from "./commands/setAnnualRewards";
import { setAdmin } from "./commands/setAdmin";
import { showMiner, showMinter, showMintWrapper, showQuarry, showRewarder } from "./commands/show";
import { createQuarry } from "./commands/createQuarry";
import { setRewardsShare } from "./commands/setRewardsShare";
import { createTokadapt } from "./commands/createTokadapt";
import { setupAll } from "./commands/setupAll";
const expandTilde = require('expand-tilde');

const program = new Command();


program
  .version("0.0.1")
  .allowExcessArguments(false)
  .option("-c, --cluster <cluster>", "Solana cluster", "devnet")
  .option("--commitment <commitment>", "Commitment", "confirmed")
  .option("-k, --keypair <keypair>", "Wallet keypair", "~/.config/solana/id.json")
  .hook('preAction', setup);


program
  .command("create-mint-wrapper")
  .option("-m, --mint <keypair-or-pubkey>", "Create or use mint")
  .option("-d, --decimals <decimals>", "Decimals", '9')
  .option("-h, --hardcap <hardcap>", "Hard cap")
  .option("--mint-wrapper-base <mintWrapperBase>", "Mint wrapper base")
  .option("-a, --admin <admin>", "Admin authority")
  .option("-s, --simulate", "Simulate")
  .action(async (options) => { await createMintWrapper(options) })

program
  .command("create-rewarder")
  .argument("mintWrapper")
  .option("--rewarder-base <keypair>", "Rewarder address base")
  .option("--hardcap <hardcap>", "hard cap")
  .option("-a, --admin <admin>", "Admin authority")
  .option("--annual-rewards", "Annual rewards")
  .option("-s, --simulate", "Simulate")
  .action(async (mintWrapper, options) => { await createRewarder(mintWrapper, options) })

program
  .command("set-annual-rewards")
  .argument("rewarder")
  .argument("rate")
  .option("-a, --admin <admin>", "Admin authority")
  .option("-s, --simulate", "Simulate")
  .action(setAnnualRewards)

program
  .command("create-quarry")
  .argument("rewarder")
  .argument("stake-token")
  .option("-a, --admin <admin>", "Admin authority")
  .option("--rewards-share <sols>", "Rewards share")
  .option("-s, --simulate", "Simulate")
  .action(async (rewarder, stakeToken, options) => { await createQuarry(rewarder, stakeToken, options) })

program
  .command("set-rewards-share")
  .argument("rewarder")
  .argument("stake-token")
  .argument("rewards-share")
  .option("-a, --admin <admin>", "Admin authority")
  .option("-s, --simulate", "Simulate")
  .action(setRewardsShare)

program
  .command("set-admin")
  .argument("new-admin")
  .option("-a, --admin <admin>", "Admin authority")
  .option("--mint-wrapper <pubkey>", "Mint wrapper")
  .option("--rewarder", "Rewarder")
  .option("-s, --simulate", "Simulate")
  .action(setAdmin)

program
  .command("show-mint-wrapper")
  .argument("mint-wrapper")
  .action(showMintWrapper);

program
  .command("show-rewarder")
  .argument("rewarder")
  .action(showRewarder);

program
  .command("show-minter")
  .argument("mint-wrapper")
  .argument("authority")
  .action(showMinter);

program
  .command("show-quarry")
  .argument("rewarder")
  .argument("token")
  .action(showQuarry);

program
  .command("show-miner")
  .argument("rewarder")
  .argument("token")
  .argument("authority")
  .action(showMiner)

program
.command("create-tokadapt")
.argument("input-token")
.argument("output-token")
.option("--state", "State")
.option("--output-storage", "Output storage")
.option("-a, --admin <admin>", "Admin authority")
.option("--output-source", "Output source")
.option("--output-source-owner", "Output source owner")
.option("--output-start-amount", "Output start amount")
.option("-s, --simulate", "Simulate")
.action(async (inputToken, outputToken, options) => { await createTokadapt(inputToken, outputToken, options) })


program
.command("setup-all")
.argument("keys-dir")
.action(async (keysDir) => {
  await setupAll(keysDir)
})

program.parseAsync(process.argv).then(
  () => process.exit(),
  (err: any) => {
    console.error(err);
    process.exit(-1);
  }
);
