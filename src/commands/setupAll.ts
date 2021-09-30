import { createMintWrapper } from "./createMintWrapper"
import { createQuarry } from "./createQuarry"
import { createRewarder } from "./createRewarder"
import * as anchor from '@project-serum/anchor';
import fs from 'mz/fs';
import { createTokadapt } from "./createTokadapt";
const expandTilde = require('expand-tilde');

export async function setupAll(keysDir: string) {
  const {
    mint: pointsMint,
    mintWrapper,
  } = await createMintWrapper({
    mint: keysDir + "/points.json",
    mintWrapperBase: keysDir + "/mint_base.json",
    admin: keysDir + "/admin.json",
    simulate: false,
  })

  const {
    rewarder
  } = await createRewarder(mintWrapper.toBase58(), {
    rewarderBase: keysDir + "/rewarder_base.json",
    admin: keysDir + "/admin.json",
    simulate: false
  })

  const {
    quarry: mSOLQuarry
  } = await createQuarry(rewarder.toBase58(), 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', {
    admin: keysDir + "/admin.json",
    rewardsShare: '1000',
    simulate: false
  })

  const {
    quarry: lpQuarry
  } = await createQuarry(rewarder.toBase58(), 'LPmSozJJ8Jh69ut2WP3XmVohTjL4ipR18yiCzxrUmVj', {
    admin: keysDir + "/admin.json",
    rewardsShare: '1000',
    simulate: false
  })

  const {
    state: tokadapt,
    outputStorage,
    admin
  } = await createTokadapt(pointsMint.toBase58(), {
    state: keysDir + "/tokadapt.json",
    outputStorage: keysDir + "/mndeStorage.json",
    admin: keysDir + "/admin.json",
    simulate: false
  })

  return {
    admin,
    pointsMint,
    mintWrapper,
    rewarder,
    mSOL: { 
      quarry: mSOLQuarry,
    },
    lp: {
      quarry: lpQuarry,
    },
    tokadapt,
    outputStorage
  }
}