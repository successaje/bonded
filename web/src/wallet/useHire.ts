import { useCallback, useRef, useState } from "react";
import { maxUint256, parseEventLogs, type Hex } from "viem";
import { erc20Abi, jobEscrowAbi } from "../lib/abis";
import { addresses, publicClient, txUrl } from "../lib/chain";
import { friendlyError } from "./errors";
import { useWalletCtx } from "./WalletContext";

/** JobEscrow.State — matches the deployed contract exactly. */
const JOB_STATE = { Funded: 1, Delivered: 2, Disputed: 3, Passed: 4, Failed: 5 } as const;

export type HireStep =
  | "idle"
  | "checking"
  | "approving"
  | "hiring"
  | "watching"
  | "passed"
  | "failed"
  | "error";

export interface HireResult {
  jobId: bigint;
  primary: bigint;
  secondary: bigint;
}

export interface HireFlow {
  step: HireStep;
  hireTx: Hex | null;
  jobId: bigint | null;
  result: HireResult | null;
  error: string | null;
  start: () => Promise<void>;
  reset: () => void;
}

/** Approve (if needed) → hire → poll to settlement. One flow, driven by the
 *  same contracts the autonomous agents already use — this is that exact
 *  path, just signed by a human wallet instead of a burner key. */
export function useHire(offerId: bigint, price: bigint): HireFlow {
  const { address, walletClient, refreshBalance } = useWalletCtx();
  const [step, setStep] = useState<HireStep>("idle");
  const [hireTx, setHireTx] = useState<Hex | null>(null);
  const [jobId, setJobId] = useState<bigint | null>(null);
  const [result, setResult] = useState<HireResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const reset = useCallback(() => {
    cancelled.current = true;
    setStep("idle");
    setHireTx(null);
    setJobId(null);
    setResult(null);
    setError(null);
  }, []);

  const start = useCallback(async () => {
    if (!walletClient || !address) return;
    cancelled.current = false;
    setError(null);
    try {
      setStep("checking");
      const [balance, allowance] = await Promise.all([
        publicClient.readContract({ address: addresses.usdc, abi: erc20Abi, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
        publicClient.readContract({ address: addresses.usdc, abi: erc20Abi, functionName: "allowance", args: [address, addresses.jobEscrow] }) as Promise<bigint>,
      ]);

      if (balance < price) {
        setStep("error");
        setError(`Not enough USDC — you have ${(Number(balance) / 1e6).toFixed(2)}, need ${(Number(price) / 1e6).toFixed(2)}.`);
        return;
      }

      if (allowance < price) {
        setStep("approving");
        const approveTx = await walletClient.writeContract({
          address: addresses.usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [addresses.jobEscrow, maxUint256],
          chain: walletClient.chain,
          account: address,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
        if (approveReceipt.status !== "success") throw new Error("Approval transaction failed.");
      }
      if (cancelled.current) return;

      setStep("hiring");
      const hash = await walletClient.writeContract({
        address: addresses.jobEscrow,
        abi: jobEscrowAbi,
        functionName: "hire",
        args: [offerId],
        chain: walletClient.chain,
        account: address,
      });
      setHireTx(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Hire transaction failed.");

      const [funded] = parseEventLogs({ abi: jobEscrowAbi, logs: receipt.logs, eventName: "JobFunded" });
      const newJobId = (funded?.args as { jobId?: bigint } | undefined)?.jobId;
      if (newJobId == null) throw new Error("Could not read the new job id from the transaction.");
      setJobId(newJobId);
      void refreshBalance();

      setStep("watching");
      const started = Date.now();
      while (!cancelled.current && Date.now() - started < 5 * 60_000) {
        const job = (await publicClient.readContract({
          address: addresses.jobEscrow,
          abi: jobEscrowAbi,
          functionName: "getJob",
          args: [newJobId],
        })) as { state: number; price: bigint; premium: bigint; bondSlice: bigint };

        if (job.state === JOB_STATE.Passed) {
          setResult({ jobId: newJobId, primary: job.price - job.premium, secondary: job.premium });
          setStep("passed");
          void refreshBalance();
          return;
        }
        if (job.state === JOB_STATE.Failed) {
          setResult({ jobId: newJobId, primary: job.price, secondary: job.bondSlice });
          setStep("failed");
          void refreshBalance();
          return;
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
    } catch (e) {
      if (cancelled.current) return;
      setStep("error");
      setError(friendlyError(e));
    }
  }, [walletClient, address, offerId, price, refreshBalance]);

  return { step, hireTx, jobId, result, error, start, reset };
}

export { txUrl };
