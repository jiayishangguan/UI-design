const { ADDR, ACTION, as18, proposeAndApprove, printState, ethers } = require("./common");

async function main() {
  await printState("BEFORE STEP 4");

  const amount = as18(process.env.RT_MINT_TO_CM || "100000");
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const data = abiCoder.encode(["address", "uint256"], [ADDR.CM, amount]);

  await proposeAndApprove({
    label: "Mint RT to CommitteeManager",
    actionType: ACTION.MINT_RT,
    target: ADDR.RT,
    data,
  });

  await printState("AFTER STEP 4");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});