import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

export const generateNewSigner = async (connection: Connection, airdropSolAmount: number): Promise<Keypair> => {
    // Generate signer keypair
    const signer = Keypair.generate();

    // Request airdrop SOL for signer wallet
    const token_airdrop = await connection.requestAirdrop(signer.publicKey, airdropSolAmount * LAMPORTS_PER_SOL);
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: token_airdrop,
    });

    return signer;
}
