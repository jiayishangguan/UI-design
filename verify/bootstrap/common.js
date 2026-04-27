const hre = require("hardhat");
const { ethers } = hre;

function need(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

const ADDR = {
  CM: need("COMMITTEE_MANAGER_ADDRESS"),
  GT: need("GREEN_TOKEN_ADDRESS"),
  RT: need("REWARD_TOKEN_ADDRESS"),
  VM: need("VERIFIER_MANAGER_ADDRESS"),
  AV: need("ACTIVITY_VERIFICATION_ADDRESS"),
  AMM: need("AMM_POOL_ADDRESS"),
};

const ACTION = {
  ADD_MEMBER: 0,
  REMOVE_MEMBER: 1,
  INIT_POOL: 2,
  INJECT_BUFFER: 3,
  SET_GT_MINTER: 4,
  SET_RT_MINTER: 5,
  MINT_RT: 6,
  ADD_REWARD: 7,
  REMOVE_REWARD: 8,
  GENERIC_CALL: 9,
  MINT_GT: 10,
  LOCK_START: 11,
};

function as18(value) {
  return ethers.parseUnits(String(value), 18);
}

async function getWallets() {
  const [member1] = await ethers.getSigners();
  const member2 = new ethers.Wallet(
    need("COMMITTEE_MEMBER_2_PRIVATE_KEY"),
    ethers.provider
  );
  return { member1, member2 };
}

async function getContracts() {
  const cm = await ethers.getContractAt("CommitteeManager", ADDR.CM);
  const gt = await ethers.getContractAt("GreenToken", ADDR.GT);
  const rt = await ethers.getContractAt("RewardToken", ADDR.RT);
  const vm = await ethers.getContractAt("VerifierManager", ADDR.VM);
  const av = await ethers.getContractAt("ActivityVerification", ADDR.AV);
  const amm = await ethers.getContractAt("AMMPool", ADDR.AMM);

  return { cm, gt, rt, vm, av, amm };
}

async function proposeAndApprove({ label, actionType, target, data }) {
  const { cm } = await getContracts();
  const { member1, member2 } = await getWallets();

  console.log("\n====================================");
  console.log(`STEP: ${label}`);
  console.log("====================================");
  console.log("member1 (proposer):", member1.address);
  console.log("member2 (approver):", member2.address);
  console.log("actionType:", actionType);
  console.log("target:", target);
  console.log("data:", data);

  const proposalId = await cm.proposalCount();

  const tx1 = await cm.connect(member1).propose(actionType, target, data);
  const rc1 = await tx1.wait();
  console.log("\nPropose tx:", rc1.hash);
  console.log("Proposal ID:", proposalId.toString());

  const tx2 = await cm.connect(member2).approveProposal(proposalId);
  const rc2 = await tx2.wait();
  console.log("Approve tx:", rc2.hash);

  return proposalId;
}

async function printState(title = "STATE CHECK") {
  const { gt, rt, vm, amm } = await getContracts();

  console.log("\n------------------------------------");
  console.log(title);
  console.log("------------------------------------");

  try {
    const gtMinter = await gt.minter();
    console.log("GT minter:", gtMinter);
  } catch (e) {
    console.log("GT minter: <cannot read>");
  }

  try {
    const rtMinter = await rt.minter();
    console.log("RT minter:", rtMinter);
  } catch (e) {
    console.log("RT minter: <cannot read>");
  }

  try {
    const avInVm = await vm.activityVerification();
    console.log("VerifierManager.activityVerification:", avInVm);
  } catch (e) {
    console.log("VerifierManager.activityVerification: <cannot read>");
  }

  try {
    const gtBal = await gt.balanceOf(ADDR.CM);
    console.log("CommitteeManager GT balance:", ethers.formatUnits(gtBal, 18));
  } catch (e) {
    console.log("CommitteeManager GT balance: <cannot read>");
  }

  try {
    const rtBal = await rt.balanceOf(ADDR.CM);
    console.log("CommitteeManager RT balance:", ethers.formatUnits(rtBal, 18));
  } catch (e) {
    console.log("CommitteeManager RT balance: <cannot read>");
  }

  try {
    const gtAllowance = await gt.allowance(ADDR.CM, ADDR.AMM);
    console.log("GT allowance CM->AMM:", ethers.formatUnits(gtAllowance, 18));
  } catch (e) {
    console.log("GT allowance CM->AMM: <cannot read>");
  }

  try {
    const rtAllowance = await rt.allowance(ADDR.CM, ADDR.AMM);
    console.log("RT allowance CM->AMM:", ethers.formatUnits(rtAllowance, 18));
  } catch (e) {
    console.log("RT allowance CM->AMM: <cannot read>");
  }

  try {
    const reserves = await amm.getReserves();
    console.log("AMM reserveGT:", ethers.formatUnits(reserves[0], 18));
    console.log("AMM reserveRT:", ethers.formatUnits(reserves[1], 18));
    console.log("AMM k:", reserves[2].toString());
  } catch (e) {
    console.log("AMM reserves: <cannot read>");
  }

  try {
    const bufferRT = await amm.bufferRT();
    console.log("AMM bufferRT:", ethers.formatUnits(bufferRT, 18));
  } catch (e) {
    console.log("AMM bufferRT: <cannot read>");
  }

  console.log("------------------------------------\n");
}

module.exports = {
  ADDR,
  ACTION,
  as18,
  proposeAndApprove,
  printState,
  getContracts,
  ethers,
};