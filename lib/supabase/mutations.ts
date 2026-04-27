"use client";

import type { RedemptionRecord, TaskRecord, UserProfile } from "@/types/database";

import { getReadableErrorMessage } from "@/lib/errors";

import { supabase } from "./browser";

export async function upsertProfile(profile: UserProfile) {
  const response = await fetch("/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profile)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(getReadableErrorMessage(payload, "Profile save failed."));
  }
  return payload.profile as UserProfile;
}

export async function touchLastLogin(address: string) {
  await supabase
    .from("user_profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("address", address.toLowerCase());
}

export async function createTaskDraft(task: Omit<TaskRecord, "id">) {
  const { data, error } = await supabase.from("tasks").insert(task).select("*").single();
  if (error) throw new Error(getReadableErrorMessage(error, "Task draft creation failed."));
  return data as TaskRecord;
}

export async function updateTaskAfterSubmit(id: number, input: Partial<TaskRecord>) {
  const { data, error } = await supabase.from("tasks").update(input).eq("id", id).select("*").single();
  if (error) throw new Error(getReadableErrorMessage(error, "Task update failed."));
  return data as TaskRecord;
}

export async function createRedemption(record: Omit<RedemptionRecord, "id">) {
  const response = await fetch("/api/redemptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(record)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(getReadableErrorMessage(payload, "Redemption save failed."));
  }
  return payload.redemption as RedemptionRecord;
}
