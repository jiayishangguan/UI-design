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
