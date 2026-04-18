

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const { ethers, network } = hre;

  // set initial informatiom
  const FOUNDING_MEMBER_1 = "TODO_MEMBER_1";
  const FOUNDING_MEMBER_2 = "TODO_MEMBER_2";
  const FOUNDING_MEMBER_3 = "TODO_MEMBER_3";

  const MEMBER_4 = "TODO_MEMBER_4";
  const MEMBER_5 = "TODO_MEMBER_5";


  const GT_NAME = "TODO_GT_NAME";
  const GT_SYMBOL = "TODO_GT_SYMBOL";

  const RT_NAME = "TODO_RT_NAME";
  const RT_SYMBOL = "TODO_RT_SYMBOL";

  const [deployer] = await ethers.getSigners();

  // 1. CommitteeManager
  const CommitteeManager = await ethers.getContractFactory("CommitteeManager");
  const committeeManager = await CommitteeManager.deploy([
    FOUNDING_MEMBER_1,
    FOUNDING_MEMBER_2,
    FOUNDING_MEMBER_3,
  ]);
  await committeeManager.waitForDeployment();

  // 2. GreenToken
  const GreenToken = await ethers.getContractFactory("GreenToken");
  const greenToken = await GreenToken.deploy(
    GT_NAME,
    GT_SYMBOL,
    await committeeManager.getAddress()
  );
  await greenToken.waitForDeployment();

  // 3. RewardToken
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy(
    RT_NAME,
    RT_SYMBOL,
    await committeeManager.getAddress()
  );
  await rewardToken.waitForDeployment();

  // 4. VerifierManager
  const VerifierManager = await ethers.getContractFactory("VerifierManager");
  const verifierManager = await VerifierManager.deploy(
    await greenToken.getAddress(),
    await committeeManager.getAddress()
  );
  await verifierManager.waitForDeployment();

  // 5. ActivityVerification
  const ActivityVerification = await ethers.getContractFactory("ActivityVerification");
  const activityVerification = await ActivityVerification.deploy(
    await greenToken.getAddress(),
    await rewardToken.getAddress(),
    await committeeManager.getAddress(),
    await verifierManager.getAddress()
  );
  await activityVerification.waitForDeployment();

  // 6. AMMPool
  const AMMPool = await ethers.getContractFactory("AMMPool");
  const ammPool = await AMMPool.deploy(
    await greenToken.getAddress(),
    await rewardToken.getAddress(),
    await committeeManager.getAddress(),
  );
  await ammPool.waitForDeployment();

  // 7. RewardRedemption
  const RewardRedemption = await ethers.getContractFactory("RewardRedemption");
  const rewardRedemption = await RewardRedemption.deploy(
    await rewardToken.getAddress(),
    await ammPool.getAddress(),
    await committeeManager.getAddress()
  );
  await rewardRedemption.waitForDeployment();

  const output = {
    network: network.name,
    deployer: deployer.address,
    foundingMembers: [
      FOUNDING_MEMBER_1,
      FOUNDING_MEMBER_2,
      FOUNDING_MEMBER_3,
    ],
    futureMembers: [
      MEMBER_4,
      MEMBER_5,
    ],
    GT: {
      name: GT_NAME,
      symbol: GT_SYMBOL,
    },
    RT: {
      name: RT_NAME,
      symbol: RT_SYMBOL,
    },
    contracts: {
      CommitteeManager: {
        address: await committeeManager.getAddress(),
        txHash: committeeManager.deploymentTransaction().hash,
      },
      GreenToken: {
        address: await greenToken.getAddress(),
        txHash: greenToken.deploymentTransaction().hash,
      },
      RewardToken: {
        address: await rewardToken.getAddress(),
        txHash: rewardToken.deploymentTransaction().hash,
      },
      VerifierManager: {
        address: await verifierManager.getAddress(),
        txHash: verifierManager.deploymentTransaction().hash,
      },
      ActivityVerification: {
        address: await activityVerification.getAddress(),
        txHash: activityVerification.deploymentTransaction().hash,
      },
      AMMPool: {
        address: await ammPool.getAddress(),
        txHash: ammPool.deploymentTransaction().hash,
      },
      RewardRedemption: {
        address: await rewardRedemption.getAddress(),
        txHash: rewardRedemption.deploymentTransaction().hash,
      },
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const outputPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log("CommitteeManager:", await committeeManager.getAddress());
  console.log("GreenToken:", await greenToken.getAddress());
  console.log("RewardToken:", await rewardToken.getAddress());
  console.log("VerifierManager:", await verifierManager.getAddress());
  console.log("ActivityVerification:", await activityVerification.getAddress());
  console.log("AMMPool:", await ammPool.getAddress());
  console.log("RewardRedemption:", await rewardRedemption.getAddress());
  console.log("JSON:", outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});