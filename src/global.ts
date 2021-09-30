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
export let anchorProvider: anchor.Provider | undefined;
export let tokadaptProgram: anchor.Program | undefined;

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

  anchorProvider = new anchor.Provider(connection, wallet, anchor.Provider.defaultOptions());

  tokadaptProgram = new anchor.Program(tokadaptIdl as anchor.Idl, TOKADAPT_PROGRAM_ID, anchorProvider);
}

const tokadaptIdl = {
  "version": "0.0.0",
  "name": "tokadapt",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputStorage",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "adminAuthority",
          "type": "publicKey"
        },
        {
          "name": "inputMint",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "swap",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "input",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "inputAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "inputMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputStorage",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputStorageAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "target",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "close",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "adminAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "outputStorage",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputStorageAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenTarget",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rentCollector",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "State",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminAuthority",
            "type": "publicKey"
          },
          {
            "name": "inputMint",
            "type": "publicKey"
          },
          {
            "name": "outputStorage",
            "type": "publicKey"
          },
          {
            "name": "outputStorageAuthorityBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 300,
      "name": "OutputStorageAuthorityDoesNotMatch",
      "msg": "Treasury token authority does not match"
    },
    {
      "code": 301,
      "name": "OutputStorageMustNotBeCloseable",
      "msg": "Treasury token account must not be closeable"
    },
    {
      "code": 302,
      "name": "OutputStorageMustNotBeDelegated",
      "msg": "Treasury token account must not be delegated"
    },
    {
      "code": 303,
      "name": "InvalidInputMint",
      "msg": "Invalid input mint"
    },
    {
      "code": 304,
      "name": "InvalidInputAuthority",
      "msg": "Invalid input authority"
    },
    {
      "code": 305,
      "name": "InvalidCloseTokenTarget",
      "msg": "Close token target must differ from storage"
    }
  ]
};

export const TOKADAPT_PROGRAM_ID = new anchor.web3.PublicKey('tokdh9ZbWPxkFzqsKqeAwLDk6J6a8NBZtQanVuuENxa');
