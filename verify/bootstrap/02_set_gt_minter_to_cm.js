const { ADDR, ACTION, proposeAndApprove, printState, ethers } = require("./common");

async function main() {
  await printState("BEFORE STEP 2");

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const data = abiCoder.encode(["address"], [ADDR.CM]);

  await proposeAndApprove({
    label: "Set GT minter = CommitteeManager",
    actionType: ACTION.SET_GT_MINTER,
    target: ADDR.GT,
    data,
  });

  await printState("AFTER STEP 2");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});