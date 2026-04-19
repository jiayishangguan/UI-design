"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { usePublicClient } from "wagmi";

import { ACTION_TYPES } from "@/lib/constants";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import { Select } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";

export function SubmitTaskForm({
  disabled,
  onSubmit
}: {
  disabled?: boolean;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("No file selected");
  const [chainDateIso, setChainDateIso] = useState("");
  const [chainDateLabel, setChainDateLabel] = useState("Loading Sepolia date...");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    let active = true;

    async function loadChainDate() {
      if (!publicClient) {
        if (active) {
          setChainDateIso("");
          setChainDateLabel("Sepolia date unavailable");
        }
        return;
      }

      try {
        const block = await publicClient.getBlock();
        const date = new Date(Number(block.timestamp) * 1000);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        const iso = `${year}-${month}-${day}`;
        const label = new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC"
        }).format(date);

        if (active) {
          setChainDateIso(iso);
          setChainDateLabel(label);
        }
      } catch {
        if (active) {
          setChainDateIso("");
          setChainDateLabel("Sepolia date unavailable");
        }
      }
    }

    void loadChainDate();
    return () => {
      active = false;
    };
  }, [publicClient]);

  return (
    <Card className="max-w-5xl animate-fade-up">
      <h1 className="font-serif text-4xl text-white">Submit Activity</h1>
      <p className="mt-3 max-w-2xl text-white/60">
        Profile is required for submission. Your evidence image goes through `/api/upload-ipfs`, and the contract call
        always uses `submitTask(actionType, proofCID, 5)`.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
          Use an English action title and concise description for verifier clarity.
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
          The activity date now follows the latest Sepolia block date automatically. Manual date selection is disabled.
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
          JPG, PNG, and WebP are supported. Maximum file size is 10 MB.
        </div>
      </div>
      <form
        noValidate
        className="mt-8 grid gap-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            const formData = new FormData(event.currentTarget);
            const actionType = String(formData.get("actionType") ?? "").trim();
            const title = String(formData.get("title") ?? "").trim();
            const description = String(formData.get("description") ?? "").trim();
            const file = formData.get("file");

            if (!actionType) throw new Error("Please choose an activity type.");
            if (!title) throw new Error("Please enter a short activity title.");
            if (!chainDateIso) throw new Error("The latest Sepolia date is still loading. Please wait a moment and try again.");
            if (!description) throw new Error("Please enter a concise English description for the verifier.");
            if (!(file instanceof File) || file.size === 0) throw new Error("Please choose an evidence image before submitting.");

            formData.set("activity_date", chainDateIso);
            await onSubmit(formData);
            event.currentTarget.reset();
            setFileName("No file selected");
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Submission failed");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Select name="actionType" required defaultValue="">
          <option value="" disabled>
            Select action type
          </option>
          {ACTION_TYPES.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
        <Input name="title" placeholder="Title" />
        <Input name="location" placeholder="Location" />
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">Sepolia activity date</p>
          <p className="mt-2 text-white/80">{chainDateLabel}</p>
          <input name="activity_date" type="hidden" value={chainDateIso} readOnly />
        </div>
        <Textarea
          className="md:col-span-2"
          name="description"
          placeholder="Describe the action in English, including what happened, where it happened, and why it matters."
        />
        <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <input
            ref={fileInputRef}
            className="hidden"
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              setFileName(nextFile?.name ?? "No file selected");
            }}
          />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/40">Evidence upload</p>
              <p className="mt-2 text-sm text-white/65">{fileName}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Choose file
            </Button>
          </div>
        </div>
        {error ? <p className="md:col-span-2 text-sm text-red-200">{error}</p> : null}
        <div className="md:col-span-2 flex justify-end">
          <Button disabled={disabled || submitting || !chainDateIso}>
            {submitting ? "Submitting..." : "Submit for verification"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
