const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  UNIT,
  ActionType,
  encode,
  deployBaseFixture,
  configureActivityVerification,
  executeProposal,
  setGreenTokenMinter,
  mintGT,
  mintRT,
  initializePool,
  increaseTime,
} = require("./helpers/fixtures");

describe("Protocol integration", function () {
  const TASK_REWARD = 5n * UNIT;

  function signerFor(signers, address) {
    const signer = signers.find((s) => s.address.toLowerCase() === address.toLowerCase());
    if (!signer) throw new Error(`No signer for ${address}`);
    return signer;
  }

  async function addReward(base, name, cost) {
    const { members, committee, rewardRedemption } = base;
    await executeProposal(
      committee,
      members[0],
      members[1],
      ActionType.ADD_REWARD,
      rewardRedemption.target,
      encode(["string", "uint256"], [name, cost])
    );
  }

  async function fullProtocolFixture() {
    const base = await deployBaseFixture();
    const { accounts, committee, greenToken, verifierManager } = base;

    await setGreenTokenMinter(base, committee.target);

    await mintGT(base, committee.target, 1000n * UNIT);
    await mintRT(base, committee.target, 5000n * UNIT);
    await initializePool(base, 1000n * UNIT, 3000n * UNIT);

    const verifierJoiners = accounts.rest.slice(0, 5);
    for (const verifier of verifierJoiners) {
      await mintGT(base, verifier.address, 100n * UNIT);
      await greenToken.connect(verifier).approve(verifierManager.target, 100n * UNIT);
      await verifierManager.connect(verifier).joinVerifierPool();
    }

    await configureActivityVerification(base);
    await addReward(base, "Coffee Voucher", UNIT);

    return { ...base, verifierJoiners };
  }

  it("runs governance setup, verification rewards, AMM swap, and reward redemption end to end", async function () {
    const base = await loadFixture(fullProtocolFixture);
    const {
      signers,
      accounts,
      greenToken,
      rewardToken,
      verifierManager,
      activityVerification,
      ammPool,
      rewardRedemption,
      verifierJoiners,
    } = base;
    const { student } = accounts;

    expect(await verifierManager.getActiveVerifierCount()).to.equal(verifierJoiners.length);
    expect(await verifierManager.getPhase()).to.equal(1);
    expect(await ammPool.getCurrentFeeRate()).to.equal(10);
    expect((await rewardRedemption.rewards(0)).active).to.equal(true);

    await activityVerification
      .connect(student)
      .submitTask("Recycling", "ipfs://student-proof", TASK_REWARD);
    const assignedReviewers = await activityVerification.getTaskVerifiers(0);

    await increaseTime(2 * 60 + 1);
    const reviewer0 = signerFor(signers, assignedReviewers[0]);
    const reviewer1 = signerFor(signers, assignedReviewers[1]);

    await activityVerification.connect(reviewer0).voteOnTask(0, true);
    await expect(activityVerification.connect(reviewer1).voteOnTask(0, true))
      .to.emit(activityVerification, "TaskFinalized")
      .withArgs(0, 1);

    expect(await greenToken.balanceOf(student.address)).to.equal(TASK_REWARD);
    expect(await rewardToken.balanceOf(reviewer0.address)).to.equal(UNIT);
    expect(await rewardToken.balanceOf(reviewer1.address)).to.equal(UNIT);
    expect(await verifierManager.currentRound()).to.equal(1);
    expect(await verifierManager.activeTaskCount(assignedReviewers[0])).to.equal(0);

    const gtIn = 2n * UNIT;
    const expectedRTOut = await ammPool.getAmountOut(gtIn, true);
    await greenToken.connect(student).approve(ammPool.target, gtIn);
    await ammPool.connect(student).swapGTforRT(gtIn, expectedRTOut);

    expect(await rewardToken.balanceOf(student.address)).to.equal(expectedRTOut);
    expect(await greenToken.balanceOf(student.address)).to.equal(TASK_REWARD - gtIn);

    const redemptionCost = await rewardRedemption.getCurrentCost(0);
    expect(expectedRTOut).to.be.gte(redemptionCost);

    await rewardToken.connect(student).approve(rewardRedemption.target, redemptionCost);
    await expect(rewardRedemption.connect(student).redeem(0))
      .to.emit(rewardRedemption, "RewardRedeemed")
      .withArgs(student.address, 0, redemptionCost);
    expect(await rewardToken.balanceOf(student.address)).to.equal(expectedRTOut - redemptionCost);
  });
});
