const BASIS_POINTS = 10_000n;
export const TARGET_RT = 3000n;
export const BUFFER_TARGET_RT = 3600n;
export const BUFFER_INJECTION_TRIGGER_RT = 1200n;

export function parseSwapAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;

  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

export function getDynamicFee(reserveRt: bigint) {
  if (reserveRt * 100n > TARGET_RT * 80n) return 10n;
  if (reserveRt * 100n >= TARGET_RT * 60n) return 30n;
  if (reserveRt * 100n >= TARGET_RT * 40n) return 70n;
  if (reserveRt > 0n) return 150n;
  return 0n;
}

export function shouldTriggerBufferInjection(reserveRt: bigint) {
  return reserveRt < BUFFER_INJECTION_TRIGGER_RT;
}

export function getInjectedReserveState(reserveGt: bigint, reserveRt: bigint, bufferRt: bigint) {
  if (!shouldTriggerBufferInjection(reserveRt) || bufferRt === 0n) {
    return {
      reserveGt,
      reserveRt,
      bufferRt,
      injectedRt: 0n
    };
  }

  const neededRt = TARGET_RT - reserveRt;
  const injectedRt = bufferRt < neededRt ? bufferRt : neededRt;

  return {
    reserveGt,
    reserveRt: reserveRt + injectedRt,
    bufferRt: bufferRt - injectedRt,
    injectedRt
  };
}

export function getEstimatedOutput(
  amountIn: bigint,
  direction: "GT_TO_RT" | "RT_TO_GT",
  reserveGt: bigint,
  reserveRt: bigint,
  bufferRt: bigint
) {
  if (amountIn <= 0n) {
    return {
      amountOut: 0n,
      feeRate: getDynamicFee(reserveRt),
      effectiveReserveGt: reserveGt,
      effectiveReserveRt: reserveRt,
      effectiveBufferRt: bufferRt,
      injectedRt: 0n
    };
  }

  const injectedState =
    direction === "GT_TO_RT" ? getInjectedReserveState(reserveGt, reserveRt, bufferRt) : { reserveGt, reserveRt, bufferRt, injectedRt: 0n };

  const reserveIn = direction === "GT_TO_RT" ? injectedState.reserveGt : injectedState.reserveRt;
  const reserveOut = direction === "GT_TO_RT" ? injectedState.reserveRt : injectedState.reserveGt;

  if (reserveIn <= 0n || reserveOut <= 0n) {
    return {
      amountOut: 0n,
      feeRate: getDynamicFee(injectedState.reserveRt),
      effectiveReserveGt: injectedState.reserveGt,
      effectiveReserveRt: injectedState.reserveRt,
      effectiveBufferRt: injectedState.bufferRt,
      injectedRt: injectedState.injectedRt
    };
  }

  const feeRate = getDynamicFee(injectedState.reserveRt);
  const amountInWithFee = amountIn * (BASIS_POINTS - feeRate);
  const denominator = reserveIn * BASIS_POINTS + amountInWithFee;
  const amountOut = denominator > 0n ? (amountInWithFee * reserveOut) / denominator : 0n;

  return {
    amountOut,
    feeRate,
    effectiveReserveGt: injectedState.reserveGt,
    effectiveReserveRt: injectedState.reserveRt,
    effectiveBufferRt: injectedState.bufferRt,
    injectedRt: injectedState.injectedRt
  };
}

export function getSwapExplanation({
  direction,
  amountIn,
  reserveGt,
  reserveRt,
  feeRate,
  injectedRt
}: {
  direction: "GT_TO_RT" | "RT_TO_GT";
  amountIn: bigint | null;
  reserveGt: bigint;
  reserveRt: bigint;
  feeRate: bigint;
  injectedRt: bigint;
}) {
  if (!amountIn || amountIn <= 0n) {
    return "Estimated using current pool ratio, dynamic fee, and live AMM reserves.";
  }

  const pairText = direction === "GT_TO_RT" ? `GT/RT reserves ${reserveGt}/${reserveRt}` : `RT/GT reserves ${reserveRt}/${reserveGt}`;
  const injectionText =
    direction === "GT_TO_RT" && injectedRt > 0n
      ? ` Buffer support would inject ${injectedRt} RT before pricing because live AMM RT is at the 1200 trigger.`
      : "";

  return `Output = input × current swap rate × (1 - fee). Using ${pairText} with a dynamic fee of ${feeRate} bp.${injectionText}`;
}
