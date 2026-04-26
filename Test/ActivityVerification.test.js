const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  UNIT,
  deployBaseFixture,
  configureActivityVerification,
  increaseTime,
} = require("./helpers/fixtures");

describe("ActivityVerification", function () {
  const AVG_REWARD = 5n * UNIT;

  async function fixture() {
    const base = await deployBaseFixture();
    await configureActivityVerification(base);
    return base;
  }

  function signerFor(signers, address) {
    const signer = signers.find((s) => s.address.toLowerCase() === address.toLowerCase());
    if (!signer) throw new Error(`No signer for ${address}`);
    return signer;
  }

  async function submitTask(activityVerification, student) {
    await activityVerification.connect(student).submitTask("Recycling", "ipfs://proof", AVG_REWARD);
    return activityVerification.getTaskVerifiers(0);
  }

  it("submits tasks, assigns three reviewers, and enforces reward/submission limits", async function () {
    const { accounts, activityVerification, verifierManager } = await loadFixture(fixture);
    const { student } = accounts;

    await expect(
      activityVerification.connect(student).submitTask("Recycling", "ipfs://proof", UNIT)
    ).to.be.revertedWithCustomError(activityVerification, "InvalidReward");

    await expect(
      activityVerification.connect(student).submitTask("Recycling", "ipfs://proof", AVG_REWARD)
    )
      .to.emit(activityVerification, "TaskSubmitted")
      .withArgs(0, student.address, "Recycling", AVG_REWARD);

    const verifiers = await activityVerification.getTaskVerifiers(0);
    expect(verifiers.filter((addr) => addr !== ethers.ZeroAddress)).to.have.lengthOf(3);
    expect(await verifierManager.activeTaskCount(verifiers[0])).to.equal(1);

    await activityVerification.connect(student).submitTask("Composting", "ipfs://proof-2", AVG_REWARD);
    await expect(
      activityVerification.connect(student).submitTask("Tree Planting", "ipfs://proof-3", AVG_REWARD)
    ).to.be.revertedWithCustomError(activityVerification, "SubmissionLimitReached");
  });

  it("enforces voting access, cooldown, and duplicate-vote checks", async function () {
    const { signers, accounts, activityVerification } = await loadFixture(fixture);
    const { student, user } = accounts;
    const verifiers = await submitTask(activityVerification, student);
    const reviewer = signerFor(signers, verifiers[0]);

    await expect(activityVerification.connect(student).voteOnTask(0, true)).to.be.revertedWithCustomError(
      activityVerification,
      "CannotVoteOnOwnSubmission"
    );
    await expect(activityVerification.connect(reviewer).voteOnTask(0, true)).to.be.revertedWithCustomError(
      activityVerification,
      "TaskInCooldown"
    );

    await increaseTime(2 * 60 + 1);
    await expect(activityVerification.connect(user).voteOnTask(0, true)).to.be.revertedWithCustomError(
      activityVerification,
      "NotAssignedVerifier"
    );

    await activityVerification.connect(reviewer).voteOnTask(0, true);
    await expect(activityVerification.connect(reviewer).voteOnTask(0, false)).to.be.revertedWithCustomError(
      activityVerification,
      "AlreadyVoted"
    );
  });

  it("approves a task at threshold, mints GT to submitter, rewards majority voters, and clears assignments", async function () {
    const { signers, accounts, activityVerification, greenToken, rewardToken, verifierManager } =
      await loadFixture(fixture);
    const { student } = accounts;
    const verifiers = await submitTask(activityVerification, student);
    const reviewer0 = signerFor(signers, verifiers[0]);
    const reviewer1 = signerFor(signers, verifiers[1]);

    await increaseTime(2 * 60 + 1);
    await activityVerification.connect(reviewer0).voteOnTask(0, true);
    await expect(activityVerification.connect(reviewer1).voteOnTask(0, true))
      .to.emit(activityVerification, "TaskFinalized")
      .withArgs(0, 1);

    const task = await activityVerification.tasks(0);
    expect(task.status).to.equal(1);
    expect(await greenToken.balanceOf(student.address)).to.equal(AVG_REWARD);
    expect(await rewardToken.balanceOf(reviewer0.address)).to.equal(UNIT);
    expect(await rewardToken.balanceOf(reviewer1.address)).to.equal(UNIT);
    expect(await verifierManager.currentRound()).to.equal(1);
    expect(await verifierManager.activeTaskCount(verifiers[0])).to.equal(0);
  });

  it("rejects a task at rejection threshold and rewards the rejecting majority", async function () {
    const { signers, accounts, activityVerification, greenToken, rewardToken } = await loadFixture(
      fixture
    );
    const { student } = accounts;
    const verifiers = await submitTask(activityVerification, student);
    const reviewer0 = signerFor(signers, verifiers[0]);
    const reviewer1 = signerFor(signers, verifiers[1]);

    await increaseTime(2 * 60 + 1);
    await activityVerification.connect(reviewer0).voteOnTask(0, false);
    await activityVerification.connect(reviewer1).voteOnTask(0, false);

    const task = await activityVerification.tasks(0);
    expect(task.status).to.equal(2);
    expect(await greenToken.balanceOf(student.address)).to.equal(0);
    expect(await rewardToken.balanceOf(reviewer0.address)).to.equal(UNIT);
    expect(await rewardToken.balanceOf(reviewer1.address)).to.equal(UNIT);
  });

  it("finalizes expired tasks and supports committee replacement for absent verifier votes", async function () {
    const { members, accounts, activityVerification } = await loadFixture(fixture);
    const { student, user } = accounts;

    await submitTask(activityVerification, student);
    await expect(activityVerification.finalizeExpiredTask(0)).to.be.revertedWith(
      "Deadline not reached"
    );

    await increaseTime(5 * 60 + 1);
    await expect(
      activityVerification.connect(user).committeeReplaceVote(0, 0, true)
    ).to.be.revertedWithCustomError(activityVerification, "NotCommitteeMember");
    await expect(
      activityVerification.connect(members[0]).committeeReplaceVote(0, 3, true)
    ).to.be.revertedWithCustomError(activityVerification, "InvalidVerifierSlot");

    await activityVerification.connect(members[0]).committeeReplaceVote(0, 0, true);
    await expect(
      activityVerification.connect(members[1]).committeeReplaceVote(0, 0, true)
    ).to.be.revertedWithCustomError(activityVerification, "VerifierAlreadyVoted");

    await expect(activityVerification.connect(members[1]).committeeReplaceVote(0, 1, true))
      .to.emit(activityVerification, "TaskFinalized")
      .withArgs(0, 1);
  });

  it("reverts queued GT claims when no approved reward is queued", async function () {
    const { accounts, activityVerification } = await loadFixture(fixture);
    const { student } = accounts;

    await submitTask(activityVerification, student);
    await expect(activityVerification.connect(student).claimQueuedGT(0)).to.be.revertedWithCustomError(
      activityVerification,
      "NothingQueued"
    );
    await expect(activityVerification.connect(student).claimQueuedGT(99)).to.be.revertedWithCustomError(
      activityVerification,
      "TaskNotFound"
    );
  });
});
