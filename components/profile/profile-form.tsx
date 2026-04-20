"use client";
// The ProfileForm component is responsible for rendering a form that allows users to view and edit their profile information. It receives the user's current profile data, their wallet address, and a function to handle saving the updated profile information. The form includes input fields for the user's full name, student ID, email, and bio. It also manages local state for the form inputs, as well as states for handling the saving process, displaying success messages, and showing error messages if the save operation fails. When the user clicks the "Save profile" button, the component validates the input and calls the provided onSave function to update the profile information in the database.
import { useEffect, useState } from "react";

import type { UserProfile } from "@/types/database";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import { Textarea } from "@/components/common/textarea";
import { getProfileSaveErrorMessage } from "@/lib/errors";
// The component uses the useEffect hook to update the form state whenever the profile prop changes, ensuring that the form fields are always in sync with the latest profile data. The save button is disabled if the wallet address is not available, if required fields are empty, or if a save operation is currently in progress. Upon successful saving of the profile, a success message is displayed, while any errors encountered during the save process are shown as error messages to inform the user of what went wrong.
export function ProfileForm({
  profile,
  address,
  onSave
}: {
  profile: UserProfile | null;
  address?: string;
  onSave: (profile: UserProfile) => Promise<unknown>;
}) {
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    student_id: profile?.student_id ?? "",
    email: profile?.email ?? "",
    bio: profile?.bio ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
// The useEffect hook is used to update the form state whenever the profile prop changes, ensuring that the form fields are always in sync with the latest profile data.
  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? "",
      student_id: profile?.student_id ?? "",
      email: profile?.email ?? "",
      bio: profile?.bio ?? ""
    });
  }, [profile]);
// The component renders a card containing the profile form, which includes input fields for the user's full name, student ID, email, and bio. It also displays any error or success messages related to saving the profile. The "Save profile" button triggers the onSave function when clicked, allowing the user to update their profile information in the database.
  return (
    <Card className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-white">Profile</h1>
        <p className="mt-3 text-white/60">
          This lightweight profile is only used for redemption, uniqueness checks, and notifications. Editing it does
          not affect your GT or RT balances.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Full name"
          value={form.full_name}
          onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
        />
        <Input
          placeholder="Student ID"
          value={form.student_id}
          onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value }))}
        />
        <Input
          className="md:col-span-2"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <Textarea
          className="md:col-span-2"
          placeholder="Bio"
          value={form.bio}
          onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
        />
      </div>
      {error ? <p className="mt-5 text-sm text-red-200">{error}</p> : null}
      {success ? <p className="mt-5 text-sm text-emerald-100">{success}</p> : null}
      <div className="mt-6 flex justify-end">
        <Button
          disabled={!address || !form.full_name || !form.student_id || saving}
          onClick={async () => {
            if (!address) return;
            setSaving(true);
            setError(null);
            setSuccess(null);
            try {
              await onSave({
                address: address.toLowerCase(),
                full_name: form.full_name,
                student_id: form.student_id,
                email: form.email || null,
                avatar_url: null,
                bio: form.bio || null
              });
              setSuccess("Profile saved successfully.");
            } catch (cause) {
              setError(getProfileSaveErrorMessage(cause));
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </Card>
  );
}
