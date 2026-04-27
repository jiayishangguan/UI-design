const { ADDR, ACTION, as18, proposeAndApprove, printState, ethers } = require("./common");

async function main() {
  await printState("BEFORE STEP 6");

  const amount = as18(process.env.RT_APPROVE_TO_AMM || "1000000");

  const iface = new ethers.Interface([
    "function approve(address spender, uint256 amount)"
  ]);

  const raw = iface.encodeFunctionData("approve", [ADDR.AMM, amount]);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const wrapped = abiCoder.encode(["bytes"], [raw]);

  await proposeAndApprove({
    label: "CommitteeManager -> RT approve to AMM",
    actionType: ACTION.GENERIC_CALL,
    target: ADDR.RT,
    data: wrapped,
  });

  await printState("AFTER STEP 6");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});