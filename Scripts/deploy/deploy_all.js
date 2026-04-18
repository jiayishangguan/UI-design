// scripts/deploy/deploy_all.js
// CampusSwap MVP — 7 contracts + minimal wiring for Sepolia
//
// Scope: only wire what blocks core user flows (earn GT, get RT rewards).
// Everything else (INIT_POOL, ADD_REWARD, member mgmt) via frontend proposals.

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const ActionType = {
  ADD_MEMBER: 0, REMOVE_MEMBER: 1, INIT_POOL: 2, INJECT_BUFFER: 3,
  SET_FEE_RECIPIENT: 4, SET_GT_MINTER: 5, SET_RT_MINTER: 6, MINT_RT: 7,
  ADD_REWARD: 8, REMOVE_REWARD: 9, GENERIC_CALL: 10,
  MINT_GT: 11
};

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length < 3) {
    throw new Error(
      `Need 3 committee signers, got ${signers.length}. ` +
      `On Sepolia, set DEPLOYER/MEMBER2/MEMBER3_PRIVATE_KEY in .env.`
    );
  }
  const [deployer, member2, member3] = signers;
  const ABI = ethers.AbiCoder.defaultAbiCoder();

  console.log(`\n=== Deploying to ${network.name} ===`);
  console.log("Deployer (treasury):", deployer.address);
  console.log("Member2            :", member2.address);
  console.log("Member3            :", member3.address);
  console.log("---\n");

  // propose + 2/3 approve (auto-executes on 2nd vote)
  let committee;
  async function proposeAndExecute(actionType, target, data, label) {
    await (await committee.connect(deployer).propose(actionType, target, data)).wait();
    const pid = (await committee.proposalCount()) - 1n;
    await (await committee.connect(deployer).approveProposal(pid)).wait();
    await (await committee.connect(member2).approveProposal(pid)).wait();
    console.log(`  ✓ ${label} (proposal #${pid})`);
  }

  // ── 1. CommitteeManager ──
  const CM = await ethers.getContractFactory("CommitteeManager");
  committee = await CM.deploy([deployer.address, member2.address, member3.address]);
  await committee.waitForDeployment();
  const cmAddr = await committee.getAddress();
  console.log("CommitteeManager    :", cmAddr);

  // ── 2. GreenToken ──
  const GT = await ethers.getContractFactory("GreenToken");
  const gt = await GT.deploy("GreenToken", "GT", cmAddr);
  await gt.waitForDeployment();
  const gtAddr = await gt.getAddress();
  console.log("GreenToken          :", gtAddr);

  // ── 3. RewardToken ──
  const RT = await ethers.getContractFactory("RewardToken");
  const rt = await RT.deploy("RewardToken", "RT", cmAddr);
  await rt.waitForDeployment();
  const rtAddr = await rt.getAddress();
  console.log("RewardToken         :", rtAddr);

  // ── 4. AMMPool (treasury = deployer) ──
  const AMM = await ethers.getContractFactory("AMMPool");
  const amm = await AMM.deploy(gtAddr, rtAddr, cmAddr, deployer.address);
  await amm.waitForDeployment();
  const ammAddr = await amm.getAddress();
  console.log("AMMPool             :", ammAddr);

  // ── 5. VerifierManager ──
  const VM = await ethers.getContractFactory("VerifierManager");
  const vm = await VM.deploy(gtAddr, cmAddr);
  await vm.waitForDeployment();
  const vmAddr = await vm.getAddress();
  console.log("VerifierManager     :", vmAddr);

  // ── 6. ActivityVerification ──
  const AV = await ethers.getContractFactory("ActivityVerification");
  const av = await AV.deploy(gtAddr, rtAddr, cmAddr, vmAddr);
  await av.waitForDeployment();
  const avAddr = await av.getAddress();
  console.log("ActivityVerification:", avAddr);

  // ── 7. RewardRedemption ──
  const RR = await ethers.getContractFactory("RewardRedemption");
  const rr = await RR.deploy(rtAddr, ammAddr, cmAddr);
  await rr.waitForDeployment();
  const rrAddr = await rr.getAddress();
  console.log("RewardRedemption    :", rrAddr);

  // ── Minimal wiring ──
  console.log("\n--- Wiring (proposals) ---");
  await proposeAndExecute(ActionType.SET_GT_MINTER, gtAddr,
    ABI.encode(["address"], [avAddr]), "GT.setMinter → AV");
  await proposeAndExecute(ActionType.SET_RT_MINTER, rtAddr,
    ABI.encode(["address"], [avAddr]), "RT.setMinter → AV");
  const vmIface = new ethers.Interface(["function setActivityVerification(address)"]);
  await proposeAndExecute(ActionType.GENERIC_CALL, vmAddr,
    ABI.encode(["bytes"], [vmIface.encodeFunctionData("setActivityVerification", [avAddr])]),
    "VM.setActivityVerification → AV");

  // ── Save for frontend ──
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();
  const deployment = {
    network: network.name,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    committee: [deployer.address, member2.address, member3.address],
    contracts: {
      CommitteeManager: cmAddr,
      GreenToken: gtAddr,
      RewardToken: rtAddr,
      AMMPool: ammAddr,
      VerifierManager: vmAddr,
      ActivityVerification: avAddr,
      RewardRedemption: rrAddr,
    },
  };
  const outDir = path.join(__dirname, "../../deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log(`\n✓ Saved to ${outPath}`);


  if (network.name === "sepolia") {
    console.log("\n--- Waiting 60s for Etherscan to index ---");
    await new Promise(r => setTimeout(r, 60_000));
    console.log("--- Verifying on Etherscan ---");

    const { run } = require("hardhat");
    
    const verifyList = [
      { address: cmAddr, args: [[deployer.address, member2.address, member3.address]] },
      { address: gtAddr, args: ["GreenToken", "GT", cmAddr] },
      { address: rtAddr, args: ["RewardToken", "RT", cmAddr] },
      { address: ammAddr, args: [gtAddr, rtAddr, cmAddr, deployer.address] },
      { address: vmAddr, args: [gtAddr, cmAddr] },
      { address: avAddr, args: [gtAddr, rtAddr, cmAddr, vmAddr] },
      { address: rrAddr, args: [rtAddr, ammAddr, cmAddr] },
    ];
    
    for (const { address, args } of verifyList) {
      try {
        await run("verify:verify", { address, constructorArguments: args });
        console.log(`  ✓ verified ${address}`);
      } catch (e) {
        if (e.message.includes("Already Verified")) {
          console.log(`  ✓ already verified ${address}`);
        } else {
          console.log(`  ✗ verify failed for ${address}: ${e.message}`);
        }
      }
    }
  }

  console.log("\n=== Deployment Complete ===");
  console.log("\nNext steps via frontend proposals:");
  console.log("  • ADD_REWARD: coffee (name='Coffee', baseCost=20)");
  console.log("  • INIT_POOL: after treasury holds 1000 GT + 3000 RT");
  console.log("  • ADD_MEMBER: expand committee to 4 or 5");
  console.log("  • Students can already call AV.submitTask()\n");
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
module.exports = { deploy: main };