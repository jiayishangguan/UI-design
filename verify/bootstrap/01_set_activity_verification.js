const { ADDR, ACTION, proposeAndApprove, printState, ethers } = require("./common");

async function main() {
  await printState("BEFORE STEP 1");

  const iface = new ethers.Interface([
    "function setActivityVerification(address)"
  ]);

  const raw = iface.encodeFunctionData("setActivityVerification", [ADDR.AV]);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const wrapped = abiCoder.encode(["bytes"], [raw]);

  await proposeAndApprove({
    label: "Set VerifierManager.activityVerification = AV",
    actionType: ACTION.GENERIC_CALL,
    target: ADDR.VM,
    data: wrapped,
  });

  await printState("AFTER STEP 1");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});