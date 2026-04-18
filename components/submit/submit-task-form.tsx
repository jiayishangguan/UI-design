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
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, index) => String(currentYear - 1 + index));
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ] as const;
  const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));

  function buildIsoDate() {
    if (!day || !month || !year) return "";
    const iso = `${year}-${month}-${day}`;
    const parsed = new Date(`${iso}T00:00:00`);
    const valid =
      !Number.isNaN(parsed.getTime()) &&
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() + 1 === Number(month) &&
      parsed.getUTCDate() === Number(day);
    return valid ? iso : "";
  }

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
          Choose the date in British order: <code>DD / MM / YYYY</code>. The form will store it as an ISO date.
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
            const isoDate = buildIsoDate();
            const actionType = String(formData.get("actionType") ?? "").trim();
            const title = String(formData.get("title") ?? "").trim();
            const description = String(formData.get("description") ?? "").trim();
            const file = formData.get("file");

            if (!actionType) throw new Error("Please choose an activity type.");
            if (!title) throw new Error("Please enter a short activity title.");
            if (!isoDate) throw new Error("Please choose a valid activity date in DD / MM / YYYY order.");
            if (!description) throw new Error("Please enter a concise English description for the verifier.");
            if (!(file instanceof File) || file.size === 0) throw new Error("Please choose an evidence image before submitting.");

            formData.set("activity_date", isoDate);
            await onSubmit(formData);
            event.currentTarget.reset();
            setFileName("No file selected");
            setDay("");
            setMonth("");
            setYear("");
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
        <div className="grid grid-cols-3 gap-3">
          <Select value={day} onChange={(event) => setDay(event.target.value)} aria-label="Day">
            <option value="">Day</option>
            {days.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Month">
            <option value="">Month</option>
            {months.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Year">
            <option value="">Year</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
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
          <Button disabled={disabled || submitting}>{submitting ? "Submitting..." : "Submit for verification"}</Button>
        </div>
      </form>
    </Card>
  );
}
