const { ADDR, ACTION, as18, proposeAndApprove, printState, ethers } = require("./common");
const recipients = require("./recipients");

function allRecipients() {
  return [...recipients.committees, ...recipients.users];
}

async function main() {
  const list = allRecipients();

  await printState("BEFORE BATCH RT MINT");

  let totalRT = 0n;

  for (const item of list) {
    if (!item.address || item.address === "0x...") {
      throw new Error(`Invalid address for ${item.name}`);
    }

    const amountStr = item.rt || "0";
    const amount = as18(amountStr);

    if (amount === 0n) {
      console.log(`\nSkip RT mint for ${item.name} (${item.address}) because rt = 0`);
      continue;
    }

    totalRT += amount;

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const data = abiCoder.encode(["address", "uint256"], [item.address, amount]);

    await proposeAndApprove({
      label: `Mint RT to ${item.name}`,
      actionType: ACTION.MINT_RT,
      target: ADDR.RT,
      data,
    });

    const rt = await ethers.getContractAt("RewardToken", ADDR.RT);
    const bal = await rt.balanceOf(item.address);

    console.log(`RT balance of ${item.name}:`, ethers.formatUnits(bal, 18));
  }

  console.log("\n====================================");
  console.log("BATCH RT MINT FINISHED");
  console.log("====================================");
  console.log("Total RT minted in this batch:", ethers.formatUnits(totalRT, 18));

  await printState("AFTER BATCH RT MINT");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});