"use client";

import { useState } from "react";
import { decodeEventLog } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { createTaskDraft, updateTaskAfterSubmit } from "@/lib/supabase/mutations";

type SubmitInput = {
  address: string;
  actionType: string;
  proofCID: string;
  title: string;
  description: string;
  location: string;
  activity_date: string;
};

export function useSubmitTask() {
  const [submitting, setSubmitting] = useState(false);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  async function submitTask(input: SubmitInput) {
    if (!publicClient) throw new Error("Public client unavailable");

    setSubmitting(true);
    const draft = await createTaskDraft({
      on_chain_task_id: null,
      tx_hash: null,
      block_number: null,
      proof_cid: input.proofCID,
      submitter_address: input.address.toLowerCase(),
      action_type: input.actionType,
      title: input.title,
      description: input.description,
      location: input.location,
      activity_date: input.activity_date,
      gt_reward: 5,
      status: "submitted"
    });

    try {
      const hash = await writeContractAsync({
        address: contractAddresses.ActivityVerification as `0x${string}`,
        abi: abis.ActivityVerification,
        functionName: "submitTask",
        args: [input.actionType, input.proofCID, 5n]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let onChainTaskId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: abis.ActivityVerification,
            data: log.data,
            topics: log.topics
          });
          if (parsed.eventName === "TaskSubmitted") {
            onChainTaskId = Number((parsed.args as unknown as { taskId: bigint }).taskId);
            break;
          }
        } catch {
          // Ignore unrelated logs.
        }
      }

      const updated = await updateTaskAfterSubmit(draft.id, {
        on_chain_task_id: onChainTaskId,
        tx_hash: hash,
        block_number: Number(receipt.blockNumber),
        status: "verifying"
      });

      return { hash, receipt, task: updated };
    } catch (error) {
      await updateTaskAfterSubmit(draft.id, { tx_hash: null, status: "submitted" });
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitTask, submitting };
}
