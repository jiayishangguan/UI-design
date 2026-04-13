const { ethers } = require("hardhat");

async function main() {
  console.log("Starting local deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy();

  await governance.waitForDeployment();

  const governanceAddress = await governance.getAddress();

  console.log("Governance deployed successfully.");
  console.log("Governance address:", governanceAddress);

  // Optional quick checks
  const currentPhase = await governance.currentPhase();
  const isCommittee = await governance.isCommittee(deployer.address);

  console.log("Initial phase:", currentPhase.toString());
  console.log("Deployer is committee:", isCommittee);
}

main().catch((error) => {
  console.error("Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});