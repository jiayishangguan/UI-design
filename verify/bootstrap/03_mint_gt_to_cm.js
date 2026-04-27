const { ADDR, ACTION, as18, proposeAndApprove, printState, ethers } = require("./common");

async function main() {
  await printState("BEFORE STEP 3");

  const amount = as18(process.env.GT_MINT_TO_CM || "100000");
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const data = abiCoder.encode(["address", "uint256"], [ADDR.CM, amount]);

  await proposeAndApprove({
    label: "Mint GT to CommitteeManager",
    actionType: ACTION.MINT_GT,
    target: ADDR.GT,
    data,
  });

  await printState("AFTER STEP 3");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});