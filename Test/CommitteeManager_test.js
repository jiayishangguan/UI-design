const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CommitteeManager V2", function () {
  let committee;
  let owner, member2, member3, nonMember, extra;

  beforeEach(async function () {
    [owner, member2, member3, nonMember, extra] = await ethers.getSigners();
    const CommitteeManager = await ethers.getContractFactory("CommitteeManager");
    committee = await CommitteeManager.deploy([
      owner.address,
      member2.address,
      member3.address,
    ]);
    await committee.waitForDeployment();
  });

  // ========== Constructor Tests ==========

  describe("Constructor", function () {
    it("Should initialize 3 committee members correctly", async function () {
      expect(await committee.isCommitteeMember(owner.address)).to.be.true;
      expect(await committee.isCommitteeMember(member2.address)).to.be.true;
      expect(await committee.isCommitteeMember(member3.address)).to.be.true;
      expect(await committee.memberCount()).to.equal(3);
    });

    it("approvalThreshold should be 2 (2/3 of 3)", async function () {
      expect(await committee.approvalThreshold()).to.equal(2);
    });

    it("Non-member should not be flagged as committee", async function () {
      expect(await committee.isCommitteeMember(nonMember.address)).to.be.false;
    });

    it("Should revert with InvalidMemberCount if less than 3 members", async function () {
      const CM = await ethers.getContractFactory("CommitteeManager");
      await expect(
        CM.deploy([owner.address, member2.address])
      ).to.be.revertedWithCustomError(CM, "InvalidMemberCount");
    });

    it("Should revert with InvalidMemberCount if more than 5 members", async function () {
      const CM = await ethers.getContractFactory("CommitteeManager");
      const signers = await ethers.getSigners();
      await expect(
        CM.deploy(signers.slice(0, 6).map(s => s.address))
      ).to.be.revertedWithCustomError(CM, "InvalidMemberCount");
    });

    it("Should revert with DuplicateMember on duplicate addresses", async function () {
      const CM = await ethers.getContractFactory("CommitteeManager");
      await expect(
        CM.deploy([owner.address, owner.address, member3.address])
      ).to.be.revertedWithCustomError(CM, "DuplicateMember");
    });

    it("Should revert with ZeroAddress if any member is address(0)", async function () {
      const CM = await ethers.getContractFactory("CommitteeManager");
      await expect(
        CM.deploy([owner.address, ethers.ZeroAddress, member3.address])
      ).to.be.revertedWithCustomError(CM, "ZeroAddress");
    });
  });

  // ========== Propose Tests ==========

  describe("Propose", function () {
    it("Committee member should be able to create a proposal with targetContract", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      // ADD_MEMBER = 0, targetContract is ignored (forced to address(0))
      const tx = await committee.propose(0, ethers.ZeroAddress, data);
      await tx.wait();

      expect(await committee.proposalCount()).to.equal(1);

      const proposal = await committee.getProposal(0);
      expect(proposal.actionType).to.equal(0); // ADD_MEMBER
      expect(proposal.targetContract).to.equal(ethers.ZeroAddress); // Forced to zero
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.approvalCount).to.equal(0);
      expect(proposal.status).to.equal(0); // Pending
    });

    it("External action must specify non-zero targetContract", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [1000]
      );
      // INJECT_RT = 2, targetContract = address(0) should revert
      await expect(
        committee.propose(2, ethers.ZeroAddress, data)
      ).to.be.revertedWithCustomError(committee, "ZeroAddress");
    });

    it("Should revert with EmptyProposalData if data is empty", async function () {
      await expect(
        committee.propose(0, ethers.ZeroAddress, "0x")
      ).to.be.revertedWithCustomError(committee, "EmptyProposalData");
    });

    it("Non-member should revert with NotCommitteeMember", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await expect(
        committee.connect(nonMember).propose(0, ethers.ZeroAddress, data)
      ).to.be.revertedWithCustomError(committee, "NotCommitteeMember");
    });

    it("Should emit ProposalCreated with targetContract", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [500]
      );
      const fakeTarget = extra.address; // Using as a fake AMMPool address
      await expect(committee.propose(2, fakeTarget, data)) // INJECT_RT
        .to.emit(committee, "ProposalCreated")
        .withArgs(0, 2, owner.address, fakeTarget);
    });
  });

  // ========== Approve Tests ==========

  describe("ApproveProposal", function () {
    let proposalId;

    beforeEach(async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await committee.propose(0, ethers.ZeroAddress, data); // ADD_MEMBER
      proposalId = 0;
    });

    it("First approval should not execute (below threshold)", async function () {
      await committee.approveProposal(proposalId);

      const proposal = await committee.getProposal(proposalId);
      expect(proposal.approvalCount).to.equal(1);
      expect(proposal.status).to.equal(0); // Pending
      expect(await committee.isCommitteeMember(extra.address)).to.be.false;
    });

    it("Second approval should auto-execute ADD_MEMBER", async function () {
      await committee.approveProposal(proposalId);
      await committee.connect(member2).approveProposal(proposalId);

      const proposal = await committee.getProposal(proposalId);
      expect(proposal.approvalCount).to.equal(2);
      expect(proposal.status).to.equal(1); // Executed
      expect(proposal.consumed).to.be.true; // Internal actions auto-consumed

      expect(await committee.isCommitteeMember(extra.address)).to.be.true;
      expect(await committee.memberCount()).to.equal(4);
    });

    it("Should revert with AlreadyApproved on double-voting", async function () {
      await committee.approveProposal(proposalId);
      await expect(
        committee.approveProposal(proposalId)
      ).to.be.revertedWithCustomError(committee, "AlreadyApproved");
    });

    it("Should revert with NotCommitteeMember for non-member", async function () {
      await expect(
        committee.connect(nonMember).approveProposal(proposalId)
      ).to.be.revertedWithCustomError(committee, "NotCommitteeMember");
    });

    it("Should revert with ProposalNotPending for already-executed proposal", async function () {
      await committee.approveProposal(proposalId);
      await committee.connect(member2).approveProposal(proposalId);
      // Proposal is now Executed
      await expect(
        committee.connect(member3).approveProposal(proposalId)
      ).to.be.revertedWithCustomError(committee, "ProposalNotPending");
    });

    it("Should revert with ProposalNotFound for invalid proposal ID", async function () {
      await expect(
        committee.approveProposal(999)
      ).to.be.revertedWithCustomError(committee, "ProposalNotFound");
    });
  });

  // ========== Proposal Expiration Tests ==========

  describe("Proposal Expiration", function () {
    let proposalId;

    beforeEach(async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await committee.propose(0, ethers.ZeroAddress, data);
      proposalId = 0;
    });

    it("Should allow approval within TTL", async function () {
      // Advance 2 days (within 7-day TTL)
      await time.increase(2 * 24 * 60 * 60);
      await expect(committee.approveProposal(proposalId)).to.not.be.reverted;
    });

    it("Should revert with ProposalExpired after TTL", async function () {
      // Advance 7 days + 1 second
      await time.increase(7 * 24 * 60 * 60 + 1);
      await expect(
        committee.approveProposal(proposalId)
      ).to.be.revertedWithCustomError(committee, "ProposalExpired");
    });

    it("getEffectiveStatus should return Expired for expired pending proposals", async function () {
      await time.increase(7 * 24 * 60 * 60 + 1);
      const status = await committee.getEffectiveStatus(proposalId);
      expect(status).to.equal(3); // Expired
    });

    it("getProposal should return Expired status for expired proposals", async function () {
      await time.increase(7 * 24 * 60 * 60 + 1);
      const proposal = await committee.getProposal(proposalId);
      expect(proposal.status).to.equal(3); // Expired
    });

    it("Executed proposals should not show as Expired", async function () {
      await committee.approveProposal(proposalId);
      await committee.connect(member2).approveProposal(proposalId);

      // Even after TTL, status should remain Executed
      await time.increase(10 * 24 * 60 * 60);
      const status = await committee.getEffectiveStatus(proposalId);
      expect(status).to.equal(1); // Executed, not Expired
    });
  });

  // ========== Proposal Cancellation Tests ==========

  describe("Proposal Cancellation", function () {
    let proposalId;

    beforeEach(async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await committee.propose(0, ethers.ZeroAddress, data);
      proposalId = 0;
    });

    it("Proposer should be able to cancel their own proposal", async function () {
      await expect(committee.cancelProposal(proposalId))
        .to.emit(committee, "ProposalCancelled")
        .withArgs(proposalId, owner.address);

      const proposal = await committee.getProposal(proposalId);
      expect(proposal.status).to.equal(2); // Cancelled
    });

    it("Should revert with OnlyProposerCanCancel if non-proposer tries to cancel", async function () {
      await expect(
        committee.connect(member2).cancelProposal(proposalId)
      ).to.be.revertedWithCustomError(committee, "OnlyProposerCanCancel");
    });

    it("Cancelled proposal should not accept further approvals", async function () {
      await committee.cancelProposal(proposalId);
      await expect(
        committee.connect(member2).approveProposal(proposalId)
      ).to.be.revertedWithCustomError(committee, "ProposalNotPending");
    });

    it("Should revert with ProposalNotPending if proposal is already executed", async function () {
      await committee.approveProposal(proposalId);
      await committee.connect(member2).approveProposal(proposalId);

      await expect(
        committee.cancelProposal(proposalId)
      ).to.be.revertedWithCustomError(committee, "ProposalNotPending");
    });

    it("Should revert with ProposalNotFound for invalid ID", async function () {
      await expect(
        committee.cancelProposal(999)
      ).to.be.revertedWithCustomError(committee, "ProposalNotFound");
    });
  });

  // ========== consumeProposal Tests ==========

  describe("consumeProposal", function () {
    it("Should allow targetContract to consume an executed proposal", async function () {
      const fakeTarget = extra; // Use extra signer as fake external contract
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [1000]
      );
      // INJECT_RT = 2, target = extra.address
      await committee.propose(2, fakeTarget.address, data);

      // Approve until execution
      await committee.approveProposal(0);
      await committee.connect(member2).approveProposal(0);

      // Now extra (as targetContract) consumes
      const tx = await committee.connect(fakeTarget).consumeProposal(0);
      await expect(tx)
        .to.emit(committee, "ProposalConsumed")
        .withArgs(0, fakeTarget.address);

      // Verify consumed flag
      const proposal = await committee.getProposal(0);
      expect(proposal.consumed).to.be.true;
    });

    it("Should revert with TargetMismatch if wrong contract calls consume", async function () {
      const fakeTarget = extra;
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [1000]
      );
      await committee.propose(2, fakeTarget.address, data);
      await committee.approveProposal(0);
      await committee.connect(member2).approveProposal(0);

      // nonMember tries to consume — wrong address
      await expect(
        committee.connect(nonMember).consumeProposal(0)
      ).to.be.revertedWithCustomError(committee, "TargetMismatch");
    });

    it("Should revert with ProposalAlreadyConsumed on double consume", async function () {
      const fakeTarget = extra;
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [1000]
      );
      await committee.propose(2, fakeTarget.address, data);
      await committee.approveProposal(0);
      await committee.connect(member2).approveProposal(0);

      await committee.connect(fakeTarget).consumeProposal(0);

      // Second consume should fail
      await expect(
        committee.connect(fakeTarget).consumeProposal(0)
      ).to.be.revertedWithCustomError(committee, "ProposalAlreadyConsumed");
    });

    it("Should revert with ProposalNotExecuted if proposal is still pending", async function () {
      const fakeTarget = extra;
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [1000]
      );
      await committee.propose(2, fakeTarget.address, data);
      // Only 1 approval, not yet executed
      await committee.approveProposal(0);

      await expect(
        committee.connect(fakeTarget).consumeProposal(0)
      ).to.be.revertedWithCustomError(committee, "ProposalNotExecuted");
    });

    it("Internal actions (ADD_MEMBER) should be auto-consumed", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await committee.propose(0, ethers.ZeroAddress, data);
      await committee.approveProposal(0);
      await committee.connect(member2).approveProposal(0);

      const proposal = await committee.getProposal(0);
      expect(proposal.consumed).to.be.true;
    });
  });

  // ========== Member Management Tests ==========

  describe("Member Management", function () {
    it("ADD_MEMBER should increase member count and update threshold", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await committee.propose(0, ethers.ZeroAddress, data);
      await committee.approveProposal(0);
      await committee.connect(member2).approveProposal(0);

      expect(await committee.memberCount()).to.equal(4);
      // 4 members -> threshold = 3
      expect(await committee.approvalThreshold()).to.equal(3);
    });

    it("REMOVE_MEMBER should correctly remove a member", async function () {
      // First add 4th member
      const dataAdd = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await committee.propose(0, ethers.ZeroAddress, dataAdd);
      await committee.approveProposal(0);
      await committee.connect(member2).approveProposal(0);
      expect(await committee.memberCount()).to.equal(4);

      // Now remove member3
      const dataRemove = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [member3.address]
      );
      await committee.propose(1, ethers.ZeroAddress, dataRemove); // REMOVE_MEMBER = 1
      // 4 members -> threshold = 3, need 3 approvals
      await committee.approveProposal(1);
      await committee.connect(member2).approveProposal(1);
      await committee.connect(extra).approveProposal(1);

      expect(await committee.isCommitteeMember(member3.address)).to.be.false;
      expect(await committee.memberCount()).to.equal(3);
    });

    it("Should revert with MinMembersReached when trying to go below 3", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [member3.address]
      );
      await committee.propose(1, ethers.ZeroAddress, data);
      await committee.approveProposal(0);
      // Second approval triggers execution, _removeMember reverts
      await expect(
        committee.connect(member2).approveProposal(0)
      ).to.be.revertedWithCustomError(committee, "MinMembersReached");
    });

    it("Should revert with MaxMembersReached when trying to exceed 5", async function () {
      const signers = await ethers.getSigners();
      // Add members until we have 5
      for (let i = 0; i < 2; i++) {
        const data = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address"],
          [signers[4 + i].address]
        );
        const pid = i * 1; // proposal IDs: 0, 1
        await committee.propose(0, ethers.ZeroAddress, data);

        // Get current threshold
        const threshold = await committee.approvalThreshold();
        const currentMembers = await committee.getMembers();

        // Approve with enough members
        for (let j = 0; j < Number(threshold); j++) {
          const signer = await ethers.getSigner(currentMembers[j]);
          await committee.connect(signer).approveProposal(pid);
        }
      }

      expect(await committee.memberCount()).to.equal(5);

      // Try to add 6th member — should fail
      const data6 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [signers[6].address]
      );
      await committee.propose(0, ethers.ZeroAddress, data6);
      const pid6 = 2;
      const threshold5 = await committee.approvalThreshold(); // should be 4
      const allMembers = await committee.getMembers();

      // Approve up to threshold-1
      for (let j = 0; j < Number(threshold5) - 1; j++) {
        const signer = await ethers.getSigner(allMembers[j]);
        await committee.connect(signer).approveProposal(pid6);
      }
      // The last approval triggers execution which should revert
      const lastSigner = await ethers.getSigner(allMembers[Number(threshold5) - 1]);
      await expect(
        committee.connect(lastSigner).approveProposal(pid6)
      ).to.be.revertedWithCustomError(committee, "MaxMembersReached");
    });
  });

  // ========== View Functions Tests ==========

  describe("View Functions", function () {
    it("getMembers should return all members", async function () {
      const members = await committee.getMembers();
      expect(members.length).to.equal(3);
      expect(members).to.include(owner.address);
      expect(members).to.include(member2.address);
      expect(members).to.include(member3.address);
    });

    it("hasApproved should correctly track votes", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [extra.address]
      );
      await committee.propose(0, ethers.ZeroAddress, data);

      expect(await committee.hasApproved(0, owner.address)).to.be.false;
      await committee.approveProposal(0);
      expect(await committee.hasApproved(0, owner.address)).to.be.true;
      expect(await committee.hasApproved(0, member2.address)).to.be.false;
    });

    it("getProposal should return full details including targetContract and consumed", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [500]
      );
      await committee.propose(2, extra.address, data); // INJECT_RT targeting extra

      const proposal = await committee.getProposal(0);
      expect(proposal.actionType).to.equal(2);
      expect(proposal.targetContract).to.equal(extra.address);
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.consumed).to.be.false;
    });

    it("getProposal should revert with ProposalNotFound for invalid ID", async function () {
      await expect(
        committee.getProposal(999)
      ).to.be.revertedWithCustomError(committee, "ProposalNotFound");
    });
  });
});
