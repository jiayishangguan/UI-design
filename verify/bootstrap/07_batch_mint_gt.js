const { ADDR, ACTION, as18, proposeAndApprove, printState, ethers } = require("./common");
const recipients = require("./recipients");

function allRecipients() {
  return [...recipients.committees, ...recipients.users];
}

async function main() {
  const list = allRecipients();

  await printState("BEFORE BATCH GT MINT");

  let totalGT = 0n;

  for (const item of list) {
    if (!item.address || item.address === "0x...") {
      throw new Error(`Invalid address for ${item.name}`);
    }

    const amountStr = item.gt || "0";
    const amount = as18(amountStr);

    if (amount === 0n) {
      console.log(`\nSkip GT mint for ${item.name} (${item.address}) because gt = 0`);
      continue;
    }

    totalGT += amount;

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const data = abiCoder.encode(["address", "uint256"], [item.address, amount]);

    await proposeAndApprove({
      label: `Mint GT to ${item.name}`,
      actionType: ACTION.MINT_GT,
      target: ADDR.GT,
      data,
    });

    const gt = await ethers.getContractAt("GreenToken", ADDR.GT);
    const bal = await gt.balanceOf(item.address);

    console.log(`GT balance of ${item.name}:`, ethers.formatUnits(bal, 18));
  }

  console.log("\n====================================");
  console.log("BATCH GT MINT FINISHED");
  console.log("====================================");
  console.log("Total GT minted in this batch:", ethers.formatUnits(totalGT, 18));

  await printState("AFTER BATCH GT MINT");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});