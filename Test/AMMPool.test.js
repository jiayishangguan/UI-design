const { expect } = require("chai");
const { ethers } = require("hardhat");
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
  approveFromGovernance,
  initializePool,
} = require("./helpers/fixtures");

describe("AMMPool", function () {
  async function preparedPool(gtReserve = 1000n * UNIT, rtReserve = 3000n * UNIT) {
    const base = await deployBaseFixture();
    await setGreenTokenMinter(base, base.committee.target);
    await mintGT(base, base.committee.target, gtReserve + 1000n * UNIT);
    await mintRT(base, base.committee.target, rtReserve + 5000n * UNIT);
    await initializePool(base, gtReserve, rtReserve);
    return base;
  }

  it("validates constructor inputs and initializes reserves only through governance", async function () {
    const base = await loadFixture(deployBaseFixture);
    const { members, greenToken, rewardToken, committee, ammPool } = base;
    const AMMPool = await ethers.getContractFactory("AMMPool");

    await expect(
      AMMPool.deploy(ethers.ZeroAddress, rewardToken.target, committee.target)
    ).to.be.revertedWithCustomError(AMMPool, "InvalidGTAddress");
    await expect(
      AMMPool.deploy(greenToken.target, ethers.ZeroAddress, committee.target)
    ).to.be.revertedWithCustomError(AMMPool, "InvalidRTAddress");
    await expect(
      AMMPool.deploy(greenToken.target, greenToken.target, committee.target)
    ).to.be.revertedWithCustomError(AMMPool, "SameTokenAddress");
    await expect(
      AMMPool.deploy(greenToken.target, rewardToken.target, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(AMMPool, "InvalidCommitteeAddress");

    await expect(ammPool.connect(members[0]).initialize(1n, 1n)).to.be.revertedWithCustomError(
      ammPool,
      "NotCommitteeMember"
    );

    await setGreenTokenMinter(base, committee.target);
    await mintGT(base, committee.target, 100n * UNIT);
    await mintRT(base, committee.target, 300n * UNIT);
    await initializePool(base, 100n * UNIT, 300n * UNIT);

    expect(await ammPool.getReserves()).to.deep.equal([
      100n * UNIT,
      300n * UNIT,
      30000n * UNIT * UNIT,
    ]);

    await expect(
      executeProposal(
        committee,
        members[0],
        members[1],
        ActionType.INIT_POOL,
        ammPool.target,
        encode(["uint256", "uint256"], [1n, 1n])
      )
    ).to.be.revertedWithCustomError(committee, "ExecutionFailed");
  });

  it("calculates fee tiers and rejects uninitialized or zero-amount quotes", async function () {
    const empty = await loadFixture(deployBaseFixture);
    await expect(empty.ammPool.getCurrentFeeRate()).to.be.revertedWithCustomError(
      empty.ammPool,
      "PoolNotInitialized"
    );
    await expect(empty.ammPool.getAmountOut(1n, true)).to.be.revertedWithCustomError(
      empty.ammPool,
      "PoolNotInitialized"
    );

    const high = await preparedPool(1000n * UNIT, 3000n * UNIT);
    expect(await high.ammPool.getCurrentFeeRate()).to.equal(10);
    await expect(high.ammPool.getAmountOut(0, true)).to.be.revertedWithCustomError(
      high.ammPool,
      "ZeroAmountIn"
    );

    const mid = await preparedPool(1000n * UNIT, 2400n * UNIT);
    expect(await mid.ammPool.getCurrentFeeRate()).to.equal(30);
    const low = await preparedPool(1000n * UNIT, 1200n * UNIT);
    expect(await low.ammPool.getCurrentFeeRate()).to.equal(70);
    const critical = await preparedPool(1000n * UNIT, 1000n * UNIT);
    expect(await critical.ammPool.getCurrentFeeRate()).to.equal(150);
  });

  it("swaps GT for RT, updates reserves, and enforces slippage plus daily/holding limits", async function () {
    const base = await preparedPool();
    const { accounts, greenToken, rewardToken, ammPool } = base;
    const { user } = accounts;

    await mintGT(base, user.address, 100n * UNIT);
    await greenToken.connect(user).approve(ammPool.target, 100n * UNIT);

    const gtIn = 10n * UNIT;
    const expectedOut = await ammPool.getAmountOut(gtIn, true);
    await expect(ammPool.connect(user).swapGTforRT(gtIn, expectedOut + 1n)).to.be.revertedWithCustomError(
      ammPool,
      "SlippageTooHigh"
    );

    await expect(ammPool.connect(user).swapGTforRT(gtIn, expectedOut))
      .to.emit(ammPool, "Swap")
      .withArgs(user.address, true, gtIn, expectedOut, 10);
    expect(await rewardToken.balanceOf(user.address)).to.equal(expectedOut);
    expect(await ammPool.getUsedGTToday(user.address)).to.equal(gtIn);
    expect(await ammPool.getRemainingDailyGT(user.address)).to.equal(40n * UNIT);

    await expect(ammPool.connect(user).swapGTforRT(41n * UNIT, 0)).to.be.revertedWithCustomError(
      ammPool,
      "EffectiveGTExceeded"
    );
  });

  it("swaps RT for GT and updates the constant-product reserves", async function () {
    const base = await preparedPool();
    const { accounts, greenToken, rewardToken, ammPool } = base;
    const { user } = accounts;

    await mintRT(base, user.address, 50n * UNIT);
    await rewardToken.connect(user).approve(ammPool.target, 50n * UNIT);

    const rtIn = 10n * UNIT;
    const expectedOut = await ammPool.getAmountOut(rtIn, false);
    await ammPool.connect(user).swapRTforGT(rtIn, expectedOut);

    expect(await greenToken.balanceOf(user.address)).to.equal(expectedOut);
    const [reserveGT, reserveRT, k] = await ammPool.getReserves();
    expect(reserveGT).to.equal(1000n * UNIT - expectedOut);
    expect(reserveRT).to.equal(3010n * UNIT);
    expect(k).to.equal(reserveGT * reserveRT);
  });

  it("accepts RT buffer injections through governance and auto-injects when reserves are low", async function () {
    const base = await preparedPool(1000n * UNIT, 1000n * UNIT);
    const { members, accounts, committee, greenToken, rewardToken, ammPool } = base;
    const { user } = accounts;

    await approveFromGovernance(base, rewardToken, ammPool.target, 500n * UNIT);
    await executeProposal(
      committee,
      members[0],
      members[1],
      ActionType.INJECT_BUFFER,
      ammPool.target,
      encode(["uint256"], [500n * UNIT])
    );
    expect(await ammPool.bufferRT()).to.equal(500n * UNIT);

    await mintGT(base, user.address, 100n * UNIT);
    await greenToken.connect(user).approve(ammPool.target, UNIT);
    await ammPool.connect(user).swapGTforRT(UNIT, 0);

    const [, reserveRT, bufferRT, , lastInjectTime] = await ammPool.getPoolStatus();
    expect(reserveRT).to.be.gt(1000n * UNIT);
    expect(bufferRT).to.equal(0);
    expect(lastInjectTime).to.be.gt(0);
  });
});
