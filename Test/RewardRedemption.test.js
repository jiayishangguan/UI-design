const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  UNIT,
  ActionType,
  encode,
  deployBaseFixture,
  executeProposal,
  setGreenTokenMinter,
  mintGT,
  mintRT,
  initializePool,
} = require("./helpers/fixtures");

describe("RewardRedemption", function () {
  async function fixture() {
    const base = await deployBaseFixture();
    await setGreenTokenMinter(base, base.committee.target);
    await mintGT(base, base.committee.target, 1000n * UNIT);
    await mintRT(base, base.committee.target, 5000n * UNIT);
    await initializePool(base, 1000n * UNIT, 3000n * UNIT);
    return base;
  }

  async function addReward(base, name = "Coffee Voucher", cost = 10n * UNIT) {
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

  it("allows only the committee contract to add and remove rewards", async function () {
    const base = await loadFixture(fixture);
    const { members, rewardRedemption, committee } = base;

    await expect(
      rewardRedemption.connect(members[0]).addReward("Coffee Voucher", 10n * UNIT)
    ).to.be.revertedWithCustomError(rewardRedemption, "NotCommitteeMember");

    await addReward(base);
    const reward = await rewardRedemption.rewards(0);
    expect(reward.name).to.equal("Coffee Voucher");
    expect(reward.baseCost).to.equal(10n * UNIT);
    expect(reward.active).to.equal(true);
    expect(await rewardRedemption.nextRewardId()).to.equal(1);

    await executeProposal(
      committee,
      members[0],
      members[1],
      ActionType.REMOVE_REWARD,
      rewardRedemption.target,
      encode(["uint256"], [0])
    );
    expect((await rewardRedemption.rewards(0)).active).to.equal(false);
    await expect(rewardRedemption.getCurrentCost(0)).to.be.revertedWithCustomError(
      rewardRedemption,
      "RewardNotActive"
    );
  });

  it("calculates dynamic costs from AMM reserves and returns the catalog", async function () {
    const base = await loadFixture(fixture);
    const { rewardRedemption } = base;

    await addReward(base, "Coffee Voucher", 10n * UNIT);
    await addReward(base, "Gym Pass", 30n * UNIT);

    expect(await rewardRedemption.getCurrentCost(0)).to.equal(10n * UNIT);
    const catalog = await rewardRedemption.getCatalog();
    expect(catalog).to.have.lengthOf(2);
    expect(catalog[1].name).to.equal("Gym Pass");
  });

  it("burns the caller's approved RT when redeeming", async function () {
    const base = await loadFixture(fixture);
    const { accounts, rewardToken, rewardRedemption } = base;
    const { user } = accounts;

    await addReward(base, "Coffee Voucher", 10n * UNIT);
    await mintRT(base, user.address, 25n * UNIT);
    await rewardToken.connect(user).approve(rewardRedemption.target, 10n * UNIT);

    await expect(rewardRedemption.connect(user).redeem(0))
      .to.emit(rewardRedemption, "RewardRedeemed")
      .withArgs(user.address, 0, 10n * UNIT);
    expect(await rewardToken.balanceOf(user.address)).to.equal(15n * UNIT);
  });

  it("reverts cost lookups when the AMM has no RT reserves", async function () {
    const base = await loadFixture(deployBaseFixture);
    await addReward(base, "Coffee Voucher", 10n * UNIT);

    await expect(base.rewardRedemption.getCurrentCost(0)).to.be.revertedWithCustomError(
      base.rewardRedemption,
      "InsufficientReserves"
    );
  });
});
