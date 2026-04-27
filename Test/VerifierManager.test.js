const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  UNIT,
  deployBaseFixture,
  executeGenericCall,
  increaseTime,
  setGreenTokenMinter,
} = require("./helpers/fixtures");

describe("VerifierManager", function () {
  async function fixture() {
    const base = await deployBaseFixture();
    await setGreenTokenMinter(base, base.accounts.avOperator.address);
    await setActivityVerification(base, base.accounts.avOperator.address);
    return base;
  }

  async function setActivityVerification(base, avAddress) {
    const { members, committee, verifierManager } = base;
    const callData = verifierManager.interface.encodeFunctionData("setActivityVerification", [
      avAddress,
    ]);
    await executeGenericCall(committee, members[0], members[1], verifierManager.target, callData);
  }

  async function fundAndJoin(base, signer, amount = 100n * UNIT) {
    const { accounts, greenToken, verifierManager } = base;
    await greenToken.connect(accounts.avOperator).mint(signer.address, amount);
    await greenToken.connect(signer).approve(verifierManager.target, 100n * UNIT);
    await verifierManager.connect(signer).joinVerifierPool();
  }

  it("lets eligible GT holders join and leave while locking and returning stake", async function () {
    const base = await loadFixture(fixture);
    const { accounts, greenToken, verifierManager } = base;
    const { student, user } = accounts;

    await expect(verifierManager.connect(student).joinVerifierPool()).to.be.revertedWithCustomError(
      verifierManager,
      "ThresholdNotMet"
    );

    await fundAndJoin(base, student);
    expect(await verifierManager.getLockedStake(student.address)).to.equal(100n * UNIT);
    expect(await greenToken.balanceOf(verifierManager.target)).to.equal(100n * UNIT);
    expect(await verifierManager.getActiveVerifierCount()).to.equal(1);
    expect(await verifierManager.isEligible(student.address)).to.equal(true);

    await greenToken.connect(accounts.avOperator).mint(student.address, 100n * UNIT);
    await expect(verifierManager.connect(student).joinVerifierPool()).to.be.revertedWithCustomError(
      verifierManager,
      "AlreadyVerifier"
    );

    await greenToken.connect(accounts.avOperator).mint(user.address, 100n * UNIT);
    await greenToken.connect(user).approve(verifierManager.target, 99n * UNIT);
    await expect(verifierManager.connect(user).joinVerifierPool()).to.be.reverted;

    await expect(verifierManager.connect(student).leaveVerifierPool())
      .to.emit(verifierManager, "VerifierLeft")
      .withArgs(student.address, 100n * UNIT);
    expect(await greenToken.balanceOf(student.address)).to.equal(200n * UNIT);
    expect(await verifierManager.isEligible(student.address)).to.equal(false);
  });

  it("only the committee contract can set ActivityVerification, and only AV can mutate task state", async function () {
    const base = await loadFixture(deployBaseFixture);
    const { members, accounts, verifierManager } = base;

    await expect(
      verifierManager.connect(members[0]).setActivityVerification(accounts.avOperator.address)
    ).to.be.revertedWith("Only committee");

    await setActivityVerification(base, accounts.avOperator.address);
    expect(await verifierManager.activityVerification()).to.equal(accounts.avOperator.address);

    await expect(verifierManager.connect(accounts.user).incrementRound()).to.be.revertedWithCustomError(
      verifierManager,
      "Unauthorized"
    );
  });

  it("blocks leaving while assigned to active tasks and releases on finalization", async function () {
    const base = await loadFixture(fixture);
    const { accounts, verifierManager } = base;
    const { student, avOperator } = accounts;

    await fundAndJoin(base, student);
    await verifierManager.connect(avOperator).onTaskAssigned(student.address);
    expect(await verifierManager.activeTaskCount(student.address)).to.equal(1);
    await expect(verifierManager.connect(student).leaveVerifierPool()).to.be.revertedWithCustomError(
      verifierManager,
      "ActiveTasksPending"
    );

    await verifierManager.connect(avOperator).onTaskFinalized(student.address);
    await verifierManager.connect(student).leaveVerifierPool();
    expect(await verifierManager.activeTaskCount(student.address)).to.equal(0);
  });

  it("updates governance phase and candidate lists as active verifier count grows", async function () {
    const base = await loadFixture(fixture);
    const { members, accounts, verifierManager } = base;
    const candidates = await verifierManager.getCandidates();
    expect(candidates).to.deep.equal([members[0].address, members[1].address, members[2].address]);
    expect(await verifierManager.getPhase()).to.equal(0);

    const joiners = accounts.rest.slice(0, 10);
    for (let i = 0; i < joiners.length; i++) {
      await fundAndJoin(base, joiners[i]);
      if (i === 4) {
        expect(await verifierManager.getPhase()).to.equal(1);
      }
    }

    expect(await verifierManager.getPhase()).to.equal(2);
    expect(await verifierManager.getActiveVerifierCount()).to.equal(10);
    expect(await verifierManager.getCandidates()).to.deep.equal(joiners.map((s) => s.address));
  });

  it("tracks performance, cooldown, suspension, rounds, and stake slashing", async function () {
    const base = await loadFixture(fixture);
    const { accounts, greenToken, verifierManager } = base;
    const { student, user, avOperator } = accounts;

    await fundAndJoin(base, student);
    await verifierManager.connect(avOperator).reportPerformance(student.address, true);
    await verifierManager.connect(avOperator).reportPerformance(student.address, true);
    await verifierManager.connect(avOperator).reportPerformance(student.address, true);
    expect(await verifierManager.isEligible(student.address)).to.equal(false);

    await verifierManager.connect(avOperator).incrementRound();
    expect(await verifierManager.currentRound()).to.equal(1);
    expect(await verifierManager.isEligible(student.address)).to.equal(true);

    await verifierManager.connect(avOperator).reportPerformance(student.address, false);
    await verifierManager.connect(avOperator).reportPerformance(student.address, false);
    await verifierManager.connect(avOperator).reportPerformance(student.address, false);
    expect(await verifierManager.isEligible(student.address)).to.equal(false);
    await increaseTime(5 * 60 + 1);
    expect(await verifierManager.isEligible(student.address)).to.equal(true);

    await fundAndJoin(base, user);
    await expect(verifierManager.connect(avOperator).slashFromStake(user.address, 25n * UNIT))
      .to.emit(verifierManager, "VerifierAutoRemoved")
      .withArgs(user.address, 75n * UNIT);
    expect(await verifierManager.getLockedStake(user.address)).to.equal(0);
    expect(await greenToken.balanceOf(user.address)).to.equal(75n * UNIT);
  });

  it("defers auto-removal for under-staked verifiers until pending tasks finish", async function () {
    const base = await loadFixture(fixture);
    const { accounts, verifierManager, greenToken } = base;
    const { student, avOperator } = accounts;

    await fundAndJoin(base, student);
    await verifierManager.connect(avOperator).onTaskAssigned(student.address);
    await verifierManager.connect(avOperator).slashFromStake(student.address, 25n * UNIT);

    expect(await verifierManager.getLockedStake(student.address)).to.equal(75n * UNIT);
    expect(await verifierManager.isEligible(student.address)).to.equal(false);

    await expect(verifierManager.connect(avOperator).onTaskFinalized(student.address))
      .to.emit(verifierManager, "VerifierAutoRemoved")
      .withArgs(student.address, 75n * UNIT);
    expect(await greenToken.balanceOf(student.address)).to.equal(75n * UNIT);
  });
});
