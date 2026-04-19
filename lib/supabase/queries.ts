"use client";

import type { RedemptionRecord, TaskRecord, UserProfile } from "@/types/database";

import { getReadableErrorMessage } from "@/lib/errors";

import { supabase } from "./browser";

export async function getProfile(address: string) {
  const response = await fetch(`/api/profile?address=${address.toLowerCase()}`, {
    method: "GET",
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(getReadableErrorMessage(payload, "Profile lookup failed."));
  }
  return (payload.profile ?? null) as UserProfile | null;
}

export async function getTasksBySubmitter(address: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("submitter_address", address.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data ?? []) as TaskRecord[];
}

export async function getRedemptions(address: string) {
  const { data, error } = await supabase
    .from("redemptions")
    .select("*")
    .eq("address", address.toLowerCase())
    .order("redeemed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as RedemptionRecord[];
}

export async function getVerifierTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .not("on_chain_task_id", "is", null)
    .eq("status", "verifying")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw error;
  return (data ?? []) as TaskRecord[];
}

export async function getTaskByOnChainId(taskId: number) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("on_chain_task_id", taskId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as TaskRecord | null;
}
