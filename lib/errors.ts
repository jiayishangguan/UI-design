export function getReadableErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? error.message : null;
    const maybeDetails = "details" in error ? error.details : null;
    const maybeHint = "hint" in error ? error.hint : null;
    const maybeCode = "code" in error ? error.code : null;

    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      const parts = [maybeMessage.trim()];
      if (typeof maybeDetails === "string" && maybeDetails.trim()) {
        parts.push(maybeDetails.trim());
      }
      if (typeof maybeHint === "string" && maybeHint.trim()) {
        parts.push(`Hint: ${maybeHint.trim()}`);
      }
      if (typeof maybeCode === "string" && maybeCode.trim()) {
        parts.push(`Code: ${maybeCode.trim()}`);
      }
      return parts.join(" ");
    }
  }

  return fallback;
}

export function getProfileSaveErrorMessage(error: unknown) {
  const readable = getReadableErrorMessage(error, "Profile save failed.");

  if (readable.includes("duplicate key") && readable.toLowerCase().includes("student_id")) {
    return "This student ID is already linked to another wallet address. Please use a different student ID or contact support.";
  }

  return readable;
}

export function getReadableContractError(error: unknown, fallback = "Transaction failed before it could be confirmed.") {
  const readable = getReadableErrorMessage(error, fallback);

  if (/TaskInCooldown/i.test(readable)) {
    return "This activity is still in its 24-hour cooldown window, so verifier voting has not opened yet.";
  }

  if (/NotAssignedVerifier/i.test(readable)) {
    return "This wallet is not one of the three reviewers assigned to this activity.";
  }

  if (/AlreadyVoted|VerifierAlreadyVoted/i.test(readable)) {
    return "This reviewer has already cast a vote for the current activity.";
  }

  if (/TaskNotPending/i.test(readable)) {
    return "This activity is no longer pending review.";
  }

  if (/CannotVoteOnOwnSubmission/i.test(readable)) {
    return "A submitter cannot review their own activity.";
  }

  if (/ProposalNotPending|0x49e7376a/i.test(readable)) {
    return "This proposal is no longer pending, so it cannot be approved again.";
  }

  if (/AlreadyApproved|0x101f817a/i.test(readable)) {
    return "This wallet has already approved the proposal.";
  }

  if (/ProposalExpired|0x28a72379/i.test(readable)) {
    return "This proposal has expired and can no longer receive committee approvals.";
  }

  if (/NotCommitteeMember|0x8f950f16/i.test(readable)) {
    return "This wallet is not recognized as a committee member on-chain.";
  }

  if (/user rejected|rejected the request|denied transaction/i.test(readable)) {
    return "The wallet request was rejected before submission.";
  }

  if (/not committee member/i.test(readable)) {
    return "This wallet is not recognized as a committee member on-chain.";
  }

  if (/proposal expired/i.test(readable)) {
    return "This proposal has already expired and can no longer be approved.";
  }

  if (/proposal already approved/i.test(readable)) {
    return "This wallet has already approved the proposal.";
  }

  if (/proposal not pending/i.test(readable)) {
    return "This proposal is no longer pending, so no further committee action is available.";
  }

  if (/only proposer can cancel/i.test(readable)) {
    return "Only the original proposer can cancel this proposal.";
  }

  return readable;
}
