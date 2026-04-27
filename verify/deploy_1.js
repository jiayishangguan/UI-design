const hardhat = require("hardhat");
require("dotenv").config();

async function main() {
  const { ethers, network } = hardhat;

  const FOUNDING_MEMBER_1 = process.env.FOUNDING_MEMBER_1;
  const FOUNDING_MEMBER_2 = process.env.FOUNDING_MEMBER_2;
  const FOUNDING_MEMBER_3 = process.env.FOUNDING_MEMBER_3;

  const GT_NAME = process.env.GT_NAME;
  const GT_SYMBOL = process.env.GT_SYMBOL;

  const RT_NAME = process.env.RT_NAME;
  const RT_SYMBOL = process.env.RT_SYMBOL;

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
    await committeeManager.getAddress()
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


  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("CommitteeManager:", await committeeManager.getAddress());
  console.log("GreenToken:", await greenToken.getAddress());
  console.log("RewardToken:", await rewardToken.getAddress());
  console.log("VerifierManager:", await verifierManager.getAddress());
  console.log("ActivityVerification:", await activityVerification.getAddress());
  console.log("AMMPool:", await ammPool.getAddress());
  console.log("RewardRedemption:", await rewardRedemption.getAddress());

  console.log("CommitteeManager tx:", committeeManager.deploymentTransaction().hash);
  console.log("GreenToken tx:", greenToken.deploymentTransaction().hash);
  console.log("RewardToken tx:", rewardToken.deploymentTransaction().hash);
  console.log("VerifierManager tx:", verifierManager.deploymentTransaction().hash);
  console.log("ActivityVerification tx:", activityVerification.deploymentTransaction().hash);
  console.log("AMMPool tx:", ammPool.deploymentTransaction().hash);
  console.log("RewardRedemption tx:", rewardRedemption.deploymentTransaction().hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});