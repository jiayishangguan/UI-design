const hre = require("hardhat");
const { ethers } = hre;

/**
 * Universal calldata encoder for FTGP project
 *
 * Run:
 * npx hardhat run --no-compile scripts/utils/encode_calldata.js
 *
 * Modes:
 * 1. genericCall   -> for CommitteeManager GENERIC_CALL
 * 2. abiEncodeOnly -> for normal CommitteeManager action data
 */

// =========================
// CHANGE ONLY THIS PART
// =========================
const CONFIG = {
  // "genericCall" or "abiEncodeOnly"
  mode: "genericCall",

  // ---------------------------------
  // MODE 1: genericCall
  // ---------------------------------
  targetContract: "0x881c497A12a8dD020d046259402a03984B7f3cF4",
  functionSignature: "setActivityVerification(address)",
  functionName: "setActivityVerification",
  args: ["0xd4eCb0b3c9E5E939673635aF94e01A5a2674e2de"],

  // ---------------------------------
  // MODE 2: abiEncodeOnly
  // Example:
  // abiTypes: ["address"],
  // abiValues: ["0xd4eCb0b3c9E5E939673635aF94e01A5a2674e2de"]
  // ---------------------------------
  abiTypes: ["address"],
  abiValues: ["0xd4eCb0b3c9E5E939673635aF94e01A5a2674e2de"],
};

// =========================
// DO NOT EDIT BELOW
// =========================

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return value;
}

function printDivider(title) {
  console.log("\n==============================");
  console.log(title);
  console.log("==============================");
}

async function main() {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  if (CONFIG.mode === "genericCall") {
    if (!CONFIG.targetContract) {
      throw new Error("targetContract is required in genericCall mode");
    }

    if (!CONFIG.functionSignature) {
      throw new Error("functionSignature is required in genericCall mode");
    }

    const iface = new ethers.Interface([
      `function ${CONFIG.functionSignature}`,
    ]);

    const functionName =
      CONFIG.functionName ||
      CONFIG.functionSignature.split("(")[0].trim();

    const args = (CONFIG.args || []).map(normalizeValue);

    const rawCalldata = iface.encodeFunctionData(functionName, args);

    // For CommitteeManager GENERIC_CALL:
    // data = abi.encode(bytes rawCallData)
    const wrappedDataForCommitteeManager = abiCoder.encode(
      ["bytes"],
      [rawCalldata]
    );

    printDivider("GENERIC_CALL RESULT");
    console.log("Target contract:");
    console.log(CONFIG.targetContract);

    console.log("\nFunction signature:");
    console.log(CONFIG.functionSignature);

    console.log("\nFunction name:");
    console.log(functionName);

    console.log("\nArgs:");
    console.log(args);

    console.log("\nRaw calldata:");
    console.log(rawCalldata);

    console.log("\nWrapped data for CommitteeManager.propose(... GENERIC_CALL ...):");
    console.log(wrappedDataForCommitteeManager);

    console.log("\nUse in CommitteeManager:");
    console.log("actionType = 10   // check your enum to confirm");
    console.log(`target     = ${CONFIG.targetContract}`);
    console.log(`data       = ${wrappedDataForCommitteeManager}`);
  } else if (CONFIG.mode === "abiEncodeOnly") {
    const abiTypes = CONFIG.abiTypes || [];
    const abiValues = (CONFIG.abiValues || []).map(normalizeValue);

    if (abiTypes.length !== abiValues.length) {
      throw new Error("abiTypes length must equal abiValues length");
    }

    const encodedData = abiCoder.encode(abiTypes, abiValues);

    printDivider("ABI_ENCODE_ONLY RESULT");
    console.log("abiTypes:");
    console.log(abiTypes);

    console.log("\nabiValues:");
    console.log(abiValues);

    console.log("\nEncoded data:");
    console.log(encodedData);

    console.log("\nUse this as CommitteeManager propose data for normal action types.");
  } else {
    throw new Error('mode must be "genericCall" or "abiEncodeOnly"');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});