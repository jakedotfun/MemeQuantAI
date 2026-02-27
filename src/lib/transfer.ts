import {
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAgentKeypair } from "@/lib/agent-wallet";
import { getConnection, withRetry } from "@/lib/solana";

const GAS_RESERVE = 0.005; // SOL

export interface TransferParams {
  walletAddress: string;
  toAddress: string;
  amount: number;          // UI amount (e.g. 0.05 SOL or 100 tokens)
  tokenMint?: string;      // if null → SOL transfer
  tokenDecimals?: number;  // required for SPL transfers
}

export interface TransferResult {
  status: "SUCCESS" | "FAILED";
  txHash?: string;
  solscanUrl?: string;
  error?: string;
}

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  } catch {
    return false;
  }
}

export async function executeTransfer(params: TransferParams): Promise<TransferResult> {
  const { walletAddress, toAddress, amount, tokenMint, tokenDecimals } = params;

  console.log("[TRANSFER] ════════════════════════════════════════");
  console.log("[TRANSFER] Starting transfer");
  console.log("[TRANSFER]   From:", walletAddress);
  console.log("[TRANSFER]   To:", toAddress);
  console.log("[TRANSFER]   Amount:", amount, tokenMint ? `(token: ${tokenMint})` : "SOL");

  // Step 1: Validate recipient address
  console.log("[TRANSFER] Step 1: Validating recipient address...");
  if (!isValidSolanaAddress(toAddress)) {
    console.error("[TRANSFER] FAIL Step 1: Invalid recipient address:", toAddress);
    return { status: "FAILED", error: `Invalid recipient address: ${toAddress}` };
  }
  if (toAddress === walletAddress) {
    console.error("[TRANSFER] FAIL Step 1: Cannot send to self");
    return { status: "FAILED", error: "Cannot transfer to your own wallet." };
  }
  console.log("[TRANSFER] Step 1 OK: Address valid");

  // Step 2: Get keypair
  console.log("[TRANSFER] Step 2: Loading keypair...");
  let keypair: ReturnType<typeof getAgentKeypair>;
  try {
    keypair = getAgentKeypair(walletAddress);
    if (!keypair) {
      console.error("[TRANSFER] FAIL Step 2: Wallet not found in store for:", walletAddress);
      return { status: "FAILED", error: "Wallet not found. Deploy your agent first." };
    }
    const derivedAddress = keypair.publicKey.toBase58();
    console.log("[TRANSFER] Step 2 OK: Keypair loaded, pubkey =", derivedAddress);
    if (derivedAddress !== walletAddress) {
      console.error("[TRANSFER] FAIL Step 2: KEY MISMATCH! Stored:", walletAddress, "Derived:", derivedAddress);
      return { status: "FAILED", error: "Wallet keypair mismatch." };
    }
  } catch (err) {
    console.error("[TRANSFER] FAIL Step 2: Error loading keypair:", err);
    return { status: "FAILED", error: `Failed to load wallet keypair: ${err instanceof Error ? err.message : String(err)}` };
  }

  const connection = getConnection();
  const recipientPubkey = new PublicKey(toAddress);

  // Route to SOL or SPL transfer
  if (!tokenMint) {
    return executeSolTransfer(connection, keypair, recipientPubkey, amount);
  }
  return executeSplTransfer(
    connection,
    keypair,
    recipientPubkey,
    amount,
    new PublicKey(tokenMint),
    tokenDecimals ?? 9,
  );
}

async function executeSolTransfer(
  connection: ReturnType<typeof getConnection>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keypair: any,
  recipient: PublicKey,
  amountSol: number,
): Promise<TransferResult> {
  console.log("[TRANSFER] SOL transfer:", amountSol, "SOL");

  // Step 3: Check balance
  console.log("[TRANSFER] Step 3: Checking SOL balance...");
  let balance: number;
  try {
    balance = await withRetry("getBalance", () => connection.getBalance(keypair.publicKey));
  } catch (err) {
    console.error("[TRANSFER] FAIL Step 3: RPC getBalance error after retries:", err);
    return { status: "FAILED", error: `RPC error checking balance: ${err instanceof Error ? err.message : String(err)}` };
  }

  const solBalance = balance / 1e9;
  const lamportsToSend = Math.floor(amountSol * 1e9);
  console.log("[TRANSFER] Step 3 OK: Balance =", solBalance, "SOL, sending =", amountSol, "SOL (", lamportsToSend, "lamports)");

  if (amountSol <= 0) {
    console.error("[TRANSFER] FAIL: Amount must be > 0");
    return { status: "FAILED", error: "Transfer amount must be greater than 0." };
  }

  if (solBalance < amountSol + GAS_RESERVE) {
    console.error("[TRANSFER] FAIL Step 3: Insufficient balance.", solBalance, "< needed", amountSol + GAS_RESERVE);
    return {
      status: "FAILED",
      error: `Insufficient balance. Have ${solBalance.toFixed(4)} SOL, need ${(amountSol + GAS_RESERVE).toFixed(4)} SOL (including ${GAS_RESERVE} SOL gas reserve).`,
    };
  }

  // Step 4: Build transaction
  console.log("[TRANSFER] Step 4: Building transaction...");
  let txHash: string;
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports: lamportsToSend,
      }),
    );

    console.log("[TRANSFER]   Getting latest blockhash...");
    const latestBlockhash = await withRetry("getLatestBlockhash", () =>
      connection.getLatestBlockhash("confirmed"),
    );
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = keypair.publicKey;
    console.log("[TRANSFER]   Blockhash:", latestBlockhash.blockhash.slice(0, 20) + "...");

    // Step 5: Sign
    console.log("[TRANSFER] Step 5: Signing transaction...");
    transaction.sign(keypair);
    console.log("[TRANSFER] Step 5 OK: Signed");

    // Step 6: Send
    console.log("[TRANSFER] Step 6: Sending raw transaction...");
    txHash = await withRetry("sendRawTransaction", () =>
      connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      }),
    );
    console.log("[TRANSFER] Step 6 OK: Sent, signature:", txHash);

    // Step 7: Confirm
    console.log("[TRANSFER] Step 7: Confirming transaction...");
    const confirmation = await connection.confirmTransaction(
      {
        signature: txHash,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed",
    );

    if (confirmation.value.err) {
      console.error("[TRANSFER] FAIL Step 7: On-chain error:", JSON.stringify(confirmation.value.err));
      return {
        status: "FAILED",
        txHash,
        solscanUrl: `https://solscan.io/tx/${txHash}`,
        error: `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
      };
    }
    console.log("[TRANSFER] Step 7 OK: Confirmed!");
  } catch (err) {
    console.error("[TRANSFER] FAIL: SOL transfer error:", err);
    if (err instanceof Error) {
      console.error("[TRANSFER]   Stack:", err.stack);
    }
    // Confirmation failed — report as FAILED even if tx was sent
    // (we cannot verify it landed, so never claim success)
    return {
      status: "FAILED",
      txHash: typeof txHash! === "string" ? txHash! : undefined,
      solscanUrl: typeof txHash! === "string" ? `https://solscan.io/tx/${txHash!}` : undefined,
      error: `SOL transfer failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  console.log("[TRANSFER] ════════════════════════════════════════");
  console.log("[TRANSFER] SOL TRANSFER COMPLETE:", txHash);
  return {
    status: "SUCCESS",
    txHash,
    solscanUrl: `https://solscan.io/tx/${txHash}`,
  };
}

async function executeSplTransfer(
  connection: ReturnType<typeof getConnection>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keypair: any,
  recipient: PublicKey,
  uiAmount: number,
  mint: PublicKey,
  decimals: number,
): Promise<TransferResult> {
  console.log("[TRANSFER] SPL transfer:", uiAmount, "tokens, mint:", mint.toBase58(), "decimals:", decimals);

  if (uiAmount <= 0) {
    return { status: "FAILED", error: "Transfer amount must be greater than 0." };
  }

  // Check SOL balance for gas
  console.log("[TRANSFER] Step 3: Checking SOL balance for gas...");
  let solBalance: number;
  try {
    solBalance = (await withRetry("getBalance", () => connection.getBalance(keypair.publicKey))) / 1e9;
  } catch (err) {
    console.error("[TRANSFER] FAIL Step 3: RPC getBalance error:", err);
    return { status: "FAILED", error: `RPC error checking balance: ${err instanceof Error ? err.message : String(err)}` };
  }
  console.log("[TRANSFER] Step 3 OK: SOL balance =", solBalance);

  if (solBalance < GAS_RESERVE) {
    console.error("[TRANSFER] FAIL: Insufficient SOL for gas.", solBalance, "<", GAS_RESERVE);
    return {
      status: "FAILED",
      error: `Insufficient SOL for gas fees. Have ${solBalance.toFixed(4)} SOL, need at least ${GAS_RESERVE} SOL.`,
    };
  }

  let txHash: string | undefined;
  try {
    const rawAmount = BigInt(Math.floor(uiAmount * Math.pow(10, decimals)));
    console.log("[TRANSFER] Step 4: Raw token amount:", rawAmount.toString());

    // Get sender's token account (ATA)
    const senderAta = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    console.log("[TRANSFER]   Sender ATA:", senderAta.toBase58());

    // Get or create recipient's token account (ATA)
    const recipientAta = await getAssociatedTokenAddress(
      mint,
      recipient,
      true,  // allowOwnerOffCurve for PDAs
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    console.log("[TRANSFER]   Recipient ATA:", recipientAta.toBase58());

    const transaction = new Transaction();

    // Check if recipient ATA exists; if not, create it
    const recipientAtaInfo = await withRetry("getAccountInfo", () =>
      connection.getAccountInfo(recipientAta),
    );
    if (!recipientAtaInfo) {
      console.log("[TRANSFER]   Creating recipient ATA (doesn't exist yet)");
      transaction.add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey,  // payer
          recipientAta,       // associated token account
          recipient,          // owner
          mint,               // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        senderAta,           // source
        recipientAta,        // destination
        keypair.publicKey,   // owner
        rawAmount,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    console.log("[TRANSFER]   Getting latest blockhash...");
    const latestBlockhash = await withRetry("getLatestBlockhash", () =>
      connection.getLatestBlockhash("confirmed"),
    );
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = keypair.publicKey;

    console.log("[TRANSFER] Step 5: Signing SPL transaction...");
    transaction.sign(keypair);

    console.log("[TRANSFER] Step 6: Sending SPL transaction...");
    txHash = await withRetry("sendRawTransaction", () =>
      connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      }),
    );
    console.log("[TRANSFER] Step 6 OK: Sent, signature:", txHash);

    console.log("[TRANSFER] Step 7: Confirming...");
    const confirmation = await connection.confirmTransaction(
      {
        signature: txHash,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed",
    );

    if (confirmation.value.err) {
      console.error("[TRANSFER] FAIL Step 7: On-chain error:", JSON.stringify(confirmation.value.err));
      return {
        status: "FAILED",
        txHash,
        solscanUrl: `https://solscan.io/tx/${txHash}`,
        error: `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
      };
    }

    console.log("[TRANSFER] ════════════════════════════════════════");
    console.log("[TRANSFER] SPL TRANSFER COMPLETE:", txHash);
    return {
      status: "SUCCESS",
      txHash,
      solscanUrl: `https://solscan.io/tx/${txHash}`,
    };
  } catch (err) {
    console.error("[TRANSFER] FAIL: SPL transfer error:", err);
    if (err instanceof Error) {
      console.error("[TRANSFER]   Stack:", err.stack);
    }
    // Confirmation failed — report as FAILED even if tx was sent
    return {
      status: "FAILED",
      txHash: txHash || undefined,
      solscanUrl: txHash ? `https://solscan.io/tx/${txHash}` : undefined,
      error: `SPL token transfer failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
