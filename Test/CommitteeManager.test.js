const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  ActionType,
  encode,
  deployBaseFixture,
  executeProposal,
  increaseTime,
} = require("./helpers/fixtures");

describe("CommitteeManager", function () {
  async function fixture() {
    return deployBaseFixture();
  }

  it("initializes 3-5 unique founding members and the 2/3 threshold", async function () {
    const { members, committee } = await loadFixture(fixture);

    expect(await committee.getMemberCount()).to.equal(3);
    expect(await committee.approvalThreshold()).to.equal(2);
    expect(await committee.getMembers()).to.deep.equal([
      members[0].address,
      members[1].address,
      members[2].address,
    ]);
    expect(await committee.isCommitteeMember(members[0].address)).to.equal(true);

    const CommitteeManager = await ethers.getContractFactory("CommitteeManager");
    await expect(
      CommitteeManager.deploy([members[0].address, members[1].address])
    ).to.be.revertedWithCustomError(CommitteeManager, "InvalidMemberCount");
    await expect(
      CommitteeManager.deploy([members[0].address, members[1].address, members[0].address])
    ).to.be.revertedWithCustomError(CommitteeManager, "DuplicateMember");
    await expect(
      CommitteeManager.deploy([members[0].address, members[1].address, ethers.ZeroAddress])
    ).to.be.revertedWithCustomError(CommitteeManager, "ZeroAddress");
  });

  it("creates proposals with proposer auto-approval and rejects invalid proposers/data", async function () {
    const { members, accounts, committee, greenToken } = await loadFixture(fixture);

    await expect(
      committee
        .connect(accounts.user)
        .propose(ActionType.ADD_MEMBER, ethers.ZeroAddress, encode(["address"], [members[3].address]))
    ).to.be.revertedWithCustomError(committee, "NotCommitteeMember");

    await expect(
      committee.connect(members[0]).propose(ActionType.SET_GT_MINTER, greenToken.target, "0x")
    ).to.be.revertedWithCustomError(committee, "EmptyProposalData");

    const proposalData = encode(["address"], [members[3].address]);
    await committee
      .connect(members[0])
      .propose(ActionType.ADD_MEMBER, ethers.ZeroAddress, proposalData);

    const proposal = await committee.getProposal(0);
    expect(proposal.proposer).to.equal(members[0].address);
    expect(proposal.approvalCount).to.equal(1);
    expect(await committee.getProposalData(0)).to.equal(proposalData);
    expect(await committee.hasApproved(0, members[0].address)).to.equal(true);
  });

  it("executes add/remove member proposals and recalculates thresholds", async function () {
    const { members, committee } = await loadFixture(fixture);

    await executeProposal(
      committee,
      members[0],
      members[1],
      ActionType.ADD_MEMBER,
      ethers.ZeroAddress,
      encode(["address"], [members[3].address])
    );

    expect(await committee.isCommitteeMember(members[3].address)).to.equal(true);
    expect(await committee.getMemberCount()).to.equal(4);
    expect(await committee.approvalThreshold()).to.equal(3);

    await committee
      .connect(members[0])
      .propose(ActionType.REMOVE_MEMBER, ethers.ZeroAddress, encode(["address"], [members[3].address]));
    const proposalId = (await committee.proposalCount()) - 1n;
    await committee.connect(members[1]).approveProposal(proposalId);
    await committee.connect(members[2]).approveProposal(proposalId);

    expect(await committee.isCommitteeMember(members[3].address)).to.equal(false);
    expect(await committee.getMemberCount()).to.equal(3);
    expect(await committee.approvalThreshold()).to.equal(2);

    await committee
      .connect(members[0])
      .propose(ActionType.REMOVE_MEMBER, ethers.ZeroAddress, encode(["address"], [members[2].address]));
    await expect(committee.connect(members[1]).approveProposal(await committee.proposalCount() - 1n))
      .to.be.revertedWithCustomError(committee, "MinMembersReached");
  });

  it("prevents double approvals, supports cancellation, and reports expiration", async function () {
    const { members, committee } = await loadFixture(fixture);

    await committee
      .connect(members[0])
      .propose(ActionType.ADD_MEMBER, ethers.ZeroAddress, encode(["address"], [members[3].address]));

    await expect(committee.connect(members[0]).approveProposal(0)).to.be.revertedWithCustomError(
      committee,
      "AlreadyApproved"
    );
    await expect(committee.connect(members[1]).cancelProposal(0)).to.be.revertedWithCustomError(
      committee,
      "OnlyProposerCanCancel"
    );

    await committee.connect(members[0]).cancelProposal(0);
    expect(await committee.getEffectiveStatus(0)).to.equal(2);
    await expect(committee.connect(members[1]).approveProposal(0)).to.be.revertedWithCustomError(
      committee,
      "ProposalNotPending"
    );

    await committee
      .connect(members[0])
      .propose(ActionType.ADD_MEMBER, ethers.ZeroAddress, encode(["address"], [members[3].address]));
    await increaseTime(10 * 60 + 1);
    expect(await committee.getEffectiveStatus(1)).to.equal(3);
    await expect(committee.connect(members[1]).approveProposal(1)).to.be.revertedWithCustomError(
      committee,
      "ProposalExpired"
    );
  });

  it("locks start-only actions after LOCK_START executes", async function () {
    const { members, committee, rewardToken } = await loadFixture(fixture);

    await executeProposal(
      committee,
      members[0],
      members[1],
      ActionType.LOCK_START,
      ethers.ZeroAddress,
      "0x"
    );
    expect(await committee.startLocked()).to.equal(true);

    await expect(
      committee.connect(members[0]).propose(
        ActionType.MINT_RT,
        rewardToken.target,
        encode(["address", "uint256"], [members[0].address, 1n])
      )
    ).to.be.revertedWithCustomError(committee, "StartPhaseLocked");
  });
});
