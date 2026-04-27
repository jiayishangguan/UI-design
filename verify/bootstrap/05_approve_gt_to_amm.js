const { ADDR, ACTION, as18, proposeAndApprove, printState, ethers } = require("./common");

async function main() {
  await printState("BEFORE STEP 5");

  const amount = as18(process.env.GT_APPROVE_TO_AMM || "1000000");

  const iface = new ethers.Interface([
    "function approve(address spender, uint256 amount)"
  ]);

  const raw = iface.encodeFunctionData("approve", [ADDR.AMM, amount]);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const wrapped = abiCoder.encode(["bytes"], [raw]);

  await proposeAndApprove({
    label: "CommitteeManager -> GT approve to AMM",
    actionType: ACTION.GENERIC_CALL,
    target: ADDR.GT,
    data: wrapped,
  });

  await printState("AFTER STEP 5");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});