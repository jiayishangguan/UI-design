const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  UNIT,
  ActionType,
  encode,
  deployBaseFixture,
  executeProposal,
  setRewardTokenMinter,
} = require("./helpers/fixtures");

describe("RewardToken", function () {
  async function fixture() {
    const base = await deployBaseFixture();
    await setRewardTokenMinter(base, base.accounts.avOperator.address);
    return base;
  }

  it("stores the committee address and rejects an invalid committee", async function () {
    const { committee, rewardToken } = await loadFixture(fixture);
    expect(await rewardToken.committee()).to.equal(committee.target);

    const RewardToken = await ethers.getContractFactory("RewardToken");
    await expect(RewardToken.deploy("Bad", "BAD", ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid committee"
    );
  });

  it("sets the minter only through committee governance", async function () {
    const base = await loadFixture(deployBaseFixture);
    const { members, accounts, committee, rewardToken } = base;

    await expect(
      rewardToken.connect(members[0]).setMinter(accounts.avOperator.address)
    ).to.be.revertedWith("Not committee");

    await setRewardTokenMinter(base, accounts.avOperator.address);
    expect(await rewardToken.minter()).to.equal(accounts.avOperator.address);

    await expect(
      executeProposal(
        committee,
        members[0],
        members[1],
        ActionType.SET_RT_MINTER,
        rewardToken.target,
        encode(["address"], [ethers.ZeroAddress])
      )
    ).to.be.revertedWithCustomError(committee, "ExecutionFailed");
  });

  it("mints only for authorized callers", async function () {
    const { accounts, rewardToken } = await loadFixture(fixture);
    const { student, user, avOperator } = accounts;

    await expect(rewardToken.connect(user).mint(student.address, UNIT)).to.be.revertedWith(
      "Not authorized"
    );
    await expect(rewardToken.connect(avOperator).mint(ethers.ZeroAddress, UNIT)).to.be.revertedWith(
      "Invalid recipient"
    );
    await expect(rewardToken.connect(avOperator).mint(student.address, 0)).to.be.revertedWith(
      "Amount must be > 0"
    );

    await expect(rewardToken.connect(avOperator).mint(student.address, 3n * UNIT))
      .to.emit(rewardToken, "Minted")
      .withArgs(student.address, 3n * UNIT);
    expect(await rewardToken.balanceOf(student.address)).to.equal(3n * UNIT);
  });

  it("burns own and approved balances with validation", async function () {
    const { accounts, rewardToken } = await loadFixture(fixture);
    const { student, user, avOperator } = accounts;

    await rewardToken.connect(avOperator).mint(student.address, 10n * UNIT);

    await expect(rewardToken.connect(student).burn(2n * UNIT))
      .to.emit(rewardToken, "Burned")
      .withArgs(student.address, 2n * UNIT);
    expect(await rewardToken.balanceOf(student.address)).to.equal(8n * UNIT);

    await rewardToken.connect(student).approve(user.address, 3n * UNIT);
    await expect(rewardToken.connect(user).burnFrom(student.address, 3n * UNIT))
      .to.emit(rewardToken, "Burned")
      .withArgs(student.address, 3n * UNIT);
    expect(await rewardToken.balanceOf(student.address)).to.equal(5n * UNIT);

    await expect(rewardToken.connect(student).burn(0)).to.be.revertedWith("Amount must be > 0");
    await expect(rewardToken.connect(user).burnFrom(ethers.ZeroAddress, UNIT)).to.be.revertedWith(
      "Invalid account"
    );
    await expect(rewardToken.connect(user).burnFrom(student.address, 0)).to.be.revertedWith(
      "Amount must be > 0"
    );
  });
});
