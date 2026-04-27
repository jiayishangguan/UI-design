"use client";
// The CommitteePanel component is responsible for displaying information about the governance committee, including its members, approval threshold, and the proposals currently waiting for committee review. It receives the relevant data as props and renders it in a structured and visually appealing manner. The component also includes links to the governance actions and verifier queue for easy access by committee members. This panel serves as a central hub for committee-related information and actions within the governance system.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { GovernanceProposal } from "@/types/contracts";

import { formatAddress, formatDateTime } from "@/lib/format";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";

const QUEUE_PROPOSALS_PER_PAGE = 4;

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
  const [queuePage, setQueuePage] = useState(1);
  const sortedQueueProposals = useMemo(() => [...proposals].sort((left, right) => right.id - left.id), [proposals]);
  const queuePageCount = Math.max(1, Math.ceil(sortedQueueProposals.length / QUEUE_PROPOSALS_PER_PAGE));
  const visibleQueueProposals = useMemo(
    () => sortedQueueProposals.slice((queuePage - 1) * QUEUE_PROPOSALS_PER_PAGE, queuePage * QUEUE_PROPOSALS_PER_PAGE),
    [queuePage, sortedQueueProposals]
  );

  useEffect(() => {
    setQueuePage((currentPage) => Math.min(currentPage, queuePageCount));
  }, [queuePageCount]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <Card>
        <h1 className="font-serif text-4xl text-white">Committee Hub</h1>
        <p className="mt-3 max-w-2xl text-white/55">
          See who helps steer campus governance, how many votes a proposal needs, and where to jump in when decisions
          are waiting.
        </p>
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
            Voting rule: {threshold?.toString() ?? "—"} committee approvals move a proposal forward.
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
            Your role: {isCommitteeMember ? "You can review and vote on proposals." : "You can browse, but voting is committee-only."}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
            Before your wallet asks for a signature, we run a quick check to catch avoidable transaction issues early.
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/governance">
              <Button>Review proposals</Button>
            </Link>
            <Link href="/verifier">
              <Button variant="secondary">Check verifier queue</Button>
            </Link>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl text-white">Committee Team</h2>
          <Badge>{members.length} reviewers</Badge>
        </div>
        <div className="mt-6 space-y-3">
          {members.length ? (
            members.map((member, index) => (
              <div key={member} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/65">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Reviewer {index + 1}</p>
                <p className="mt-2 text-white">{formatAddress(member, 6)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
              No committee reviewers are listed yet.
            </div>
          )}
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl text-white">Review Queue</h2>
          <Badge>{proposals.length} waiting</Badge>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visibleQueueProposals.length ? (
            visibleQueueProposals.map((proposal) => (
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
                    <Button variant="secondary">Open review</Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55 md:col-span-2">
              Nothing is waiting for committee review right now.
            </div>
          )}
        </div>
        {queuePageCount > 1 ? (
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: queuePageCount }, (_, index) => {
                const pageNumber = index + 1;
                const isCurrentPage = pageNumber === queuePage;
                return (
                  <Button
                    key={pageNumber}
                    variant={isCurrentPage ? "secondary" : "ghost"}
                    className="h-10 min-w-10 border border-white/10 px-3"
                    aria-current={isCurrentPage ? "page" : undefined}
                    onClick={() => setQueuePage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-3 md:justify-end">
              <Button
                variant="ghost"
                className="border border-white/10"
                disabled={queuePage === 1}
                onClick={() => setQueuePage((currentPage) => Math.max(1, currentPage - 1))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                className="border border-white/10"
                disabled={queuePage === queuePageCount}
                onClick={() => setQueuePage((currentPage) => Math.min(queuePageCount, currentPage + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
