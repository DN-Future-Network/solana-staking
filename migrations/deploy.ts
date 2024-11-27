// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";
import { Program, Provider } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";

module.exports = async function (provider: Provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  const programStaking = anchor.workspace.Staking as Program<Staking>;
  console.log("Deployed program account", programStaking.programId);
};
