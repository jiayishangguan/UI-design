"use client";
// The CommitteePanel component is responsible for displaying information about the governance committee, including its members, approval threshold, and the proposals currently waiting for committee review. It receives the relevant data as props and renders it in a structured and visually appealing manner. The component also includes links to the governance actions and verifier queue for easy access by committee members. This panel serves as a central hub for committee-related information and actions within the governance system.
import Link from "next/link";

import type { GovernanceProposal } from "@/types/contracts";

import { formatAddress, formatDateTime } from "@/lib/format";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
// The component receives the loaded governance data, including the list of committee members, the approval threshold, the user's committee membership status, and the proposals awaiting committee review. It then renders this information in a structured layout, providing insights into the committee's composition and current activities.
export function CommitteePanel({
  members,
  threshold,
  isCommitteeMember,
  proposals
}: {
  members: string[];
  threshold?: bigint;
  isCommitteeMember?: boolean;
  proposals: GovernanceProposal[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <Card>
        <h1 className="font-serif text-4xl text-white">Committees</h1>
        <p className="mt-3 max-w-2xl text-white/55">
          This page focuses on committee visibility: member access, approval threshold, and the proposals currently
          waiting for committee review.
        </p>
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
            Approval threshold: {threshold?.toString() ?? "—"} committee approvals
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
            Your access: {isCommitteeMember ? "Active committee member" : "Read-only viewer"}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
            To reduce avoidable gas costs, committee actions are simulated before the wallet asks for a signature.
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/governance">
              <Button>Open governance actions</Button>
            </Link>
            <Link href="/verifier">
              <Button variant="secondary">Open verifier queue</Button>
            </Link>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl text-white">Committee Members</h2>
          <Badge>{members.length} members</Badge>
        </div>
        <div className="mt-6 space-y-3">
          {members.length ? (
            members.map((member, index) => (
              <div key={member} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/65">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Seat {index + 1}</p>
                <p className="mt-2 text-white">{formatAddress(member, 6)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
              No committee members were returned by the contract.
            </div>
          )}
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl text-white">Committee Review Queue</h2>
          <Badge>{proposals.length} proposals</Badge>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {proposals.length ? (
            proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-white">Proposal #{proposal.id}</p>
                <div className="mt-3 space-y-2 text-sm text-white/60">
                  {proposal.summary ? <p className="text-white/80">{proposal.summary}</p> : null}
                  <p>Target: {formatAddress(proposal.targetContract)}</p>
                  <p>Approvals: {proposal.approvalCount.toString()}</p>
                  <p>Created: {formatDateTime(Number(proposal.createdAt) * 1000)}</p>
                </div>
                <div className="mt-4">
                  <Link href="/governance">
                    <Button variant="secondary">Review in governance</Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
              There are no active committee proposals right now.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
