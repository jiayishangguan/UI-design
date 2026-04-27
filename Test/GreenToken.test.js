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
} = require("./helpers/fixtures");

describe("GreenToken", function () {
  async function fixture() {
    const base = await deployBaseFixture();
    await setGreenTokenMinter(base, base.accounts.avOperator.address);
    return base;
  }

  it("stores the committee address and rejects an invalid committee", async function () {
    const { committee, greenToken } = await loadFixture(fixture);
    expect(await greenToken.committee()).to.equal(committee.target);

    const GreenToken = await ethers.getContractFactory("GreenToken");
    await expect(GreenToken.deploy("Bad", "BAD", ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid committee"
    );
  });

  it("only allows the committee contract to set a non-zero minter", async function () {
    const base = await loadFixture(deployBaseFixture);
    const { members, accounts, committee, greenToken } = base;

    await expect(
      greenToken.connect(members[0]).setMinter(accounts.avOperator.address)
    ).to.be.revertedWith("Not committee");

    await setGreenTokenMinter(base, accounts.avOperator.address);
    expect(await greenToken.minter()).to.equal(accounts.avOperator.address);

    await expect(
      executeProposal(
        committee,
        members[0],
        members[1],
        ActionType.SET_GT_MINTER,
        greenToken.target,
        encode(["address"], [ethers.ZeroAddress])
      )
    ).to.be.revertedWithCustomError(committee, "ExecutionFailed");
  });

  it("mints only from the authorized minter, tracks cumulative minting, and returns tiers", async function () {
    const { accounts, greenToken } = await loadFixture(fixture);
    const { student, user, avOperator } = accounts;

    await expect(greenToken.connect(user).mint(student.address, 50n * UNIT)).to.be.revertedWith(
      "Not authorized minter"
    );
    await expect(greenToken.connect(avOperator).mint(ethers.ZeroAddress, UNIT)).to.be.revertedWith(
      "Invalid recipient"
    );
    await expect(greenToken.connect(avOperator).mint(student.address, 0)).to.be.revertedWith(
      "Amount must be > 0"
    );

    await expect(greenToken.connect(avOperator).mint(student.address, 50n * UNIT))
      .to.emit(greenToken, "Minted")
      .withArgs(student.address, 50n * UNIT, 50n * UNIT);
    expect(await greenToken.balanceOf(student.address)).to.equal(50n * UNIT);
    expect(await greenToken.totalMinted(student.address)).to.equal(50n * UNIT);
    expect(await greenToken.getTier(student.address)).to.equal(1);

    await greenToken.connect(avOperator).mint(student.address, 150n * UNIT);
    expect(await greenToken.getTier(student.address)).to.equal(2);

    await greenToken.connect(avOperator).mint(user.address, 500n * UNIT);
    expect(await greenToken.getTier(user.address)).to.equal(3);
  });

  it("slashes up to the available balance without reducing totalMinted", async function () {
    const { accounts, greenToken } = await loadFixture(fixture);
    const { student, avOperator } = accounts;

    await greenToken.connect(avOperator).mint(student.address, 20n * UNIT);
    await expect(greenToken.connect(avOperator).slash(student.address, 5n * UNIT))
      .to.emit(greenToken, "Slashed")
      .withArgs(student.address, 5n * UNIT, 5n * UNIT);
    expect(await greenToken.balanceOf(student.address)).to.equal(15n * UNIT);
    expect(await greenToken.totalMinted(student.address)).to.equal(20n * UNIT);

    await greenToken.connect(avOperator).slash(student.address, 50n * UNIT);
    expect(await greenToken.balanceOf(student.address)).to.equal(0);

    await expect(greenToken.connect(avOperator).slash(ethers.ZeroAddress, UNIT)).to.be.revertedWith(
      "Invalid user"
    );
    await expect(greenToken.connect(avOperator).slash(student.address, 0)).to.be.revertedWith(
      "Amount must be > 0"
    );
  });
});
