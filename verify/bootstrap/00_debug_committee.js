const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

async function main() {
  const CM = process.env.COMMITTEE_MANAGER_ADDRESS;
  const VM = process.env.VERIFIER_MANAGER_ADDRESS;
  const AV = process.env.ACTIVITY_VERIFICATION_ADDRESS;

  const MEMBER1_PK = process.env.DEPLOYER_PRIVATE_KEY;
  const MEMBER2_PK = process.env.MEMBER2_PRIVATE_KEY;

  console.log("CM:", CM ? "OK" : "MISSING");
console.log("VM:", VM ? "OK" : "MISSING");
console.log("AV:", AV ? "OK" : "MISSING");
console.log("DEPLOYER_PRIVATE_KEY:", MEMBER1_PK ? "OK" : "MISSING");
console.log("MEMBER2_PRIVATE_KEY:", MEMBER2_PK ? "OK" : "MISSING");

if (!CM || !VM || !AV || !MEMBER1_PK || !MEMBER2_PK) {
  throw new Error("Missing env values");
}

  const member1 = new ethers.Wallet(MEMBER1_PK, ethers.provider);
  const member2 = new ethers.Wallet(MEMBER2_PK, ethers.provider);

  const cm = await ethers.getContractAt("CommitteeManager", CM);

  console.log("member1:", member1.address);
  console.log("member2:", member2.address);

  try {
    const members = await cm.getMembers();
    console.log("getMembers():", members);
  } catch (e) {
    console.log("getMembers(): <read failed>");
  }

  try {
    const isM1 = await cm.isCommitteeMember(member1.address);
    console.log("isCommitteeMember(member1):", isM1);
  } catch (e) {
    console.log("isCommitteeMember(member1): <read failed>");
  }

  try {
    const isM2 = await cm.isCommitteeMember(member2.address);
    console.log("isCommitteeMember(member2):", isM2);
  } catch (e) {
    console.log("isCommitteeMember(member2): <read failed>");
  }

  try {
    const threshold = await cm.approvalThreshold();
    console.log("approvalThreshold:", threshold.toString());
  } catch (e) {
    console.log("approvalThreshold: <read failed>");
  }

  try {
    const startLocked = await cm.startLocked();
    console.log("startLocked:", startLocked);
  } catch (e) {
    console.log("startLocked: <read failed>");
  }

  try {
    const proposalCount = await cm.proposalCount();
    console.log("proposalCount:", proposalCount.toString());
  } catch (e) {
    console.log("proposalCount: <read failed>");
  }

  const iface = new ethers.Interface([
    "function setActivityVerification(address)"
  ]);

  const raw = iface.encodeFunctionData("setActivityVerification", [AV]);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const wrapped = abiCoder.encode(["bytes"], [raw]);

  console.log("\nraw calldata:", raw);
  console.log("wrapped data:", wrapped);

  try {
    await cm.connect(member1).propose.staticCall(10, VM, wrapped);
    console.log("\npropose.staticCall: SUCCESS");
  } catch (e) {
    console.log("\npropose.staticCall: FAILED");
    console.log("shortMessage:", e.shortMessage || "<none>");
    console.log("message:", e.message || "<none>");
    console.log("data:", e.data || "<none>");
    console.log("reason:", e.reason || "<none>");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});