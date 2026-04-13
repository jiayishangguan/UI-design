const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance", function () {
  let governance;
  let owner, committee2, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10;

  beforeEach(async function () {
    [
      owner,
      committee2,
      user1,
      user2,
      user3,
      user4,
      user5,
      user6,
      user7,
      user8,
      user9,
      user10
    ] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy();
    await governance.waitForDeployment();
  });

  it("should set deployer as initial committee and phase as Phase1", async function () {
    expect(await governance.isCommittee(owner.address)).to.equal(true);
    expect(await governance.currentPhase()).to.equal(0);
  });

  it("should allow committee to add another committee member", async function () {
    await governance.addCommittee(committee2.address);
    expect(await governance.isCommittee(committee2.address)).to.equal(true);
  });

  it("should reject adding zero address as committee", async function () {
    await expect(
      governance.addCommittee(ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid address");
  });

  it("should grant initial GT within valid range", async function () {
    await governance.grantInitialGT(user1.address, 30);
    expect(await governance.getGT(user1.address)).to.equal(30);
  });

  it("should reject invalid initial GT amount", async function () {
    await expect(
      governance.grantInitialGT(user1.address, 10)
    ).to.be.revertedWith("Invalid GT range");

    await expect(
      governance.grantInitialGT(user1.address, 60)
    ).to.be.revertedWith("Invalid GT range");
  });

  it("should allow committee to add GT", async function () {
    await governance.addGT(user1.address, 50);
    expect(await governance.getGT(user1.address)).to.equal(50);
  });

  it("should reject adding GT with zero amount", async function () {
    await expect(
      governance.addGT(user1.address, 0)
    ).to.be.revertedWith("Amount must be > 0");
  });

  it("should upgrade a user to verifier when GT reaches 100", async function () {
    await governance.addGT(user1.address, 100);

    expect(await governance.isVerifier(user1.address)).to.equal(true);
    expect(await governance.qualifiedCount()).to.equal(1);
  });

  it("should downgrade a verifier back to normal user when GT drops below 100", async function () {
    await governance.addGT(user1.address, 120);
    expect(await governance.isVerifier(user1.address)).to.equal(true);
    expect(await governance.qualifiedCount()).to.equal(1);

    await governance.deductGT(user1.address, 30);

    expect(await governance.getGT(user1.address)).to.equal(90);
    expect(await governance.isVerifier(user1.address)).to.equal(false);
    expect(await governance.qualifiedCount()).to.equal(0);
  });

  it("should reject deducting more GT than user owns", async function () {
    await expect(
      governance.deductGT(user1.address, 10)
    ).to.be.revertedWith("Insufficient GT");
  });

  it("should stay in Phase1 when qualified verifier count is below 5", async function () {
    await governance.addGT(user1.address, 100);
    await governance.addGT(user2.address, 100);
    await governance.addGT(user3.address, 100);
    await governance.addGT(user4.address, 100);

    expect(await governance.qualifiedCount()).to.equal(4);
    expect(await governance.currentPhase()).to.equal(0);
  });

  it("should move to Phase2 when qualified verifier count reaches 5", async function () {
    await governance.addGT(user1.address, 100);
    await governance.addGT(user2.address, 100);
    await governance.addGT(user3.address, 100);
    await governance.addGT(user4.address, 100);
    await governance.addGT(user5.address, 100);

    expect(await governance.qualifiedCount()).to.equal(5);
    expect(await governance.currentPhase()).to.equal(1);
  });

  it("should move to Phase3 when qualified verifier count reaches 10", async function () {
    await governance.addGT(user1.address, 100);
    await governance.addGT(user2.address, 100);
    await governance.addGT(user3.address, 100);
    await governance.addGT(user4.address, 100);
    await governance.addGT(user5.address, 100);
    await governance.addGT(user6.address, 100);
    await governance.addGT(user7.address, 100);
    await governance.addGT(user8.address, 100);
    await governance.addGT(user9.address, 100);
    await governance.addGT(user10.address, 100);

    expect(await governance.qualifiedCount()).to.equal(10);
    expect(await governance.currentPhase()).to.equal(2);
  });

  it("should return to lower phase if verifier count decreases", async function () {
    await governance.addGT(user1.address, 100);
    await governance.addGT(user2.address, 100);
    await governance.addGT(user3.address, 100);
    await governance.addGT(user4.address, 100);
    await governance.addGT(user5.address, 100);

    expect(await governance.currentPhase()).to.equal(1);

    await governance.deductGT(user5.address, 10);

    expect(await governance.isVerifier(user5.address)).to.equal(false);
    expect(await governance.qualifiedCount()).to.equal(4);
    expect(await governance.currentPhase()).to.equal(0);
  });

  it("should allow committee to trigger and disable manual governance", async function () {
    await governance.triggerManualGovernance("Emergency test");
    expect(await governance.currentPhase()).to.equal(3);

    await governance.disableManualGovernance();
    expect(await governance.currentPhase()).to.equal(0);
  });

  it("should reject disabling manual governance when not in manual mode", async function () {
    await expect(
      governance.disableManualGovernance()
    ).to.be.revertedWith("Not in manual mode");
  });

  it("should allow only committee to create proposal", async function () {
    await governance.createProposal("Initial governance proposal");

    const proposal = await governance.getProposal(1);
    expect(proposal[0]).to.equal(1);
    expect(proposal[1]).to.equal("Initial governance proposal");

    await expect(
      governance.connect(user1).createProposal("Unauthorized proposal")
    ).to.be.revertedWith("Only committee can propose");
  });

  it("should reject empty proposal description", async function () {
    await expect(
      governance.createProposal("")
    ).to.be.revertedWith("Empty description");
  });

  it("should allow only committee to vote on proposal", async function () {
    await governance.createProposal("Vote test");
    await governance.voteProposal(1, true);

    const proposal = await governance.getProposal(1);
    expect(proposal[3]).to.equal(1);
    expect(proposal[4]).to.equal(0);

    await expect(
      governance.connect(user1).voteProposal(1, true)
    ).to.be.revertedWith("Only committee can vote");
  });

  it("should reject double voting", async function () {
    await governance.createProposal("Vote test");
    await governance.voteProposal(1, true);

    await expect(
      governance.voteProposal(1, false)
    ).to.be.revertedWith("Already voted");
  });

  it("should execute proposal by committee only", async function () {
    await governance.createProposal("Execution test");
    await governance.voteProposal(1, true);
    await governance.executeProposal(1);

    const proposal = await governance.getProposal(1);
    expect(proposal[5]).to.equal(true);
    expect(proposal[6]).to.equal(false);
  });

  it("should reject voting on executed proposal", async function () {
    await governance.createProposal("Execution test");
    await governance.voteProposal(1, true);
    await governance.executeProposal(1);

    await expect(
      governance.voteProposal(1, true)
    ).to.be.revertedWith("Proposal is not active");
  });

  it("should return proposal data correctly", async function () {
    await governance.createProposal("Check proposal");

    const proposal = await governance.getProposal(1);
    expect(proposal[0]).to.equal(1);
    expect(proposal[1]).to.equal("Check proposal");
    expect(proposal[2]).to.equal(owner.address);
    expect(proposal[3]).to.equal(0);
    expect(proposal[4]).to.equal(0);
    expect(proposal[5]).to.equal(false);
    expect(proposal[6]).to.equal(true);
  });
});