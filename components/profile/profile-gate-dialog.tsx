"use client";

import { useEffect, useState } from "react";

import type { UserProfile } from "@/types/database";

import { Button } from "@/components/common/button";
import { Dialog } from "@/components/common/dialog";
import { Input } from "@/components/common/input";
import { Textarea } from "@/components/common/textarea";
import { getProfileSaveErrorMessage } from "@/lib/errors";
import { formatAddress } from "@/lib/format";

export function ProfileGateDialog({
  address,
  open,
  onClose,
  onSave,
  allowDismiss = true,
  secondaryActionLabel
}: {
  address?: string;
  open: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => Promise<unknown>;
  allowDismiss?: boolean;
  secondaryActionLabel?: string;
}) {
  const [form, setForm] = useState({
    full_name: "",
    student_id: "",
    email: "",
    bio: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      title="Welcome to CampusSwap"
      description="Complete your profile to unlock reward flows. Editing profile data will not change your on-chain GT or RT balances."
    >
      <div className="space-y-4">
        <Input
          placeholder="Full name *"
          value={form.full_name}
          onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
        />
        <Input
          placeholder="Student ID *"
          value={form.student_id}
          onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value }))}
        />
        <Input
          placeholder="Email (optional)"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <Textarea
          placeholder="Bio (optional)"
          value={form.bio}
          onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
        />
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          Connected wallet: {formatAddress(address)}
        </div>
        {error ? <p className="text-sm text-red-200">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3">
          {allowDismiss || secondaryActionLabel ? (
            <Button variant="secondary" onClick={onClose}>
              {secondaryActionLabel ?? "Complete Later"}
            </Button>
          ) : null}
          <Button
            disabled={!address || !form.full_name || !form.student_id || saving}
            onClick={async () => {
              if (!address) return;
              setSaving(true);
              setError(null);
              try {
                await onSave({
                  address: address.toLowerCase(),
                  full_name: form.full_name,
                  student_id: form.student_id,
                  email: form.email || null,
                  avatar_url: null,
                  bio: form.bio || null
                });
                onClose();
              } catch (cause) {
                setError(getProfileSaveErrorMessage(cause));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Complete Registration"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
