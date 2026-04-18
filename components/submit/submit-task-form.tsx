"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          Enter the date manually as <code>YYYY-MM-DD</code> to keep the submission format fully English.
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
          JPG, PNG, and WebP are supported. Maximum file size is 10 MB.
        </div>
      </div>
      <form
        className="mt-8 grid gap-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await onSubmit(new FormData(event.currentTarget));
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
        <Input name="title" placeholder="Title" required />
        <Input name="location" placeholder="Location" />
        <Input
          name="activity_date"
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          title="Use the format YYYY-MM-DD"
          required
        />
        <Textarea
          className="md:col-span-2"
          name="description"
          placeholder="Describe the action in English, including what happened, where it happened, and why it matters."
          required
        />
        <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <input
            ref={fileInputRef}
            className="hidden"
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
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
          <Button disabled={disabled || submitting}>{submitting ? "Submitting..." : "Submit for verification"}</Button>
        </div>
      </form>
    </Card>
  );
}
