// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CommitteeManager
 * @author Qi Wu
 * @notice Unified Governance Contract to manage protocol parameters through collective committee approval.
 * @dev Manages a Committee of 3–5 members using a 2/3 multi-sig proposal mechanism.
 *      V2 Improvements:
 *      - Custom errors (gas-efficient, replacing string revert messages)
 *      - Proposal expiration (default 7 days TTL)
 *      - Proposal cancellation (proposer-only)
 *      - Target contract binding (each proposal specifies its target contract)
 *      - consumeProposal() pattern for secure external contract integration
 *      - Enhanced data validation
 */

contract CommitteeManager {
    // Custom Errors
    error NotCommitteeMember();
    error ZeroAddress();
    error AlreadyMember();
    error NotAMember();
    error MaxMembersReached();
    error MinMembersReached();
    error DuplicateMember();
    error InvalidMemberCount();
    error ProposalNotPending();
    error AlreadyApproved();
    error ProposalExpired();
    error OnlyProposerCanCancel();
    error EmptyProposalData();
    error ProposalNotFound();
    error TargetMismatch();
    error ProposalNotExecuted();
    error ProposalAlreadyConsumed();

    // ENUMS
    /// @notice Types of actions that can be proposed
    enum ActionType {
        ADD_MEMBER,      // Add a new Committee member
        REMOVE_MEMBER,   // Remove an existing Committee member
        INJECT_RT,       // Inject Reward Tokens into the AMM pool
        UPDATE_FEE,      // Update fee parameters
        UPDATE_REWARD    // Update reward directory
    }

    /// @notice Proposal status
    enum ProposalStatus {
        Pending,
        Executed,
        Cancelled,
        Expired 
    }

    // STRUCTS
    /// @notice Proposal data structure
    struct Proposal {
        ActionType   actionType;    // What kind of action
        address targetContract;        // Which contract to act upon (address(this) for member ops)
        bytes        data;          // ABI-encoded execution payload
        address      proposer;      // Who created this proposal
        uint256      approvalCount; // Current number of approvals
        ProposalStatus status;      // Lifecycle state
        uint256      createdAt;     // Block timestamp when created
        bool consumed;     // Prevents replay — each proposal consumed at most once
        mapping(address => bool) hasApproved; // Per-member vote record
    }

    // State Variables
    mapping(address => bool) public isCommitteeMember;
    address[] public members;
    uint256 public memberCount;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    /// @notice Approval threshold: minimum votes to execute (2/3 ceiling)
    uint256 public approvalThreshold;

    /// @notice Time-to-live for proposals in seconds (default 7 days)
    uint256 public PROPOSAL_TTL = 7 days;

    // Events - for transparency and frontend tracking
    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);

    event ProposalCreated(
        uint256 indexed proposalId,
        ActionType actionType,
        address indexed proposer,
        address indexed targetContract
    );
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 currentApprovals
    );

    event ProposalExecuted(uint256 indexed proposalId, ActionType actionType);
    event ProposalCancelled(uint256 indexed proposalId, address indexed canceller);
    event ProposalConsumed(uint256 indexed proposalId, address indexed consumer);
    
    // Modifiers
    modifier onlyCommittee() {
        if (!isCommitteeMember[msg.sender]) revert NotCommitteeMember();
        _;
    }

    /**
     * @notice Deploy CommitteeManager and initialize founding members
     * @param _members Founding Committee member addresses array (3-5 addresses)
     * @dev Constructor automatically sets approvalThreshold to 2/3 of member count (rounded up)
     */
    constructor(address[] memory _members) {
        if (_members.length < 3 || _members.length > 5) revert InvalidMemberCount();

        for (uint256 i = 0; i < _members.length; i++) {
            address member = _members[i];
            if (member == address(0)) revert ZeroAddress();
            if (isCommitteeMember[member]) revert DuplicateMember();

            isCommitteeMember[member] = true;
            members.push(member);
            emit MemberAdded(member);
        }
        
        memberCount = _members.length;
        // 2/3 multi-sig threshold (ceiling): 3 members -> 2, 4 members -> 3, 5 members -> 4
        approvalThreshold = (memberCount * 2 + 2) / 3;
    }

    // Proposal Functions

    /**
     * @notice Submit a new governance proposal
     * @param _actionType Proposed action type
     * @param _targetContract External contract this targets (address(0) for ADD/REMOVE_MEMBER)
     * @param _data ABI-encoded parameters
     * @return proposalId The new proposal's ID
     */

    function propose(
        ActionType _actionType,
        address _targetContract,
        bytes calldata _data
    ) external onlyCommittee returns (uint256 proposalId) {
        if (_data.length == 0) revert EmptyProposalData();

        if (_actionType == ActionType.ADD_MEMBER || _actionType == ActionType.REMOVE_MEMBER) {
            _targetContract = address(0);
        } else {
            if (_targetContract == address(0)) revert ZeroAddress();
        }

        proposalId = proposalCount++;
        Proposal storage p = proposals[proposalId];
        p.actionType = _actionType;
        p.targetContract = _targetContract;
        p.data = _data;
        p.proposer = msg.sender;
        p.approvalCount = 0;
        p.status = ProposalStatus.Pending;
        p.createdAt = block.timestamp;
        p.consumed = false;

        emit ProposalCreated(proposalId, _actionType, msg.sender, _targetContract);
    }

    /**
     * @notice Casts a vote to approve a pending proposal
     * @param _proposalId The ID of the proposal to approve
     * @dev revents double-voting. If the threshold is met:
     *      ADD/REMOVE_MEMBER actions are executed automatically within this contract.
     *      Other types are marked Executed for external contracts to verify and act upon.
     */

    function approveProposal(uint256 _proposalId) external onlyCommittee {
        if (_proposalId >= proposalCount) revert ProposalNotFound();
        
        Proposal storage p = proposals[_proposalId];
        
        if (p.status != ProposalStatus.Pending) revert ProposalNotPending();
        if (block.timestamp > p.createdAt + PROPOSAL_TTL) revert ProposalExpired();
        if (p.hasApproved[msg.sender]) revert AlreadyApproved();

        p.hasApproved[msg.sender] = true;
        p.approvalCount++;

        emit ProposalApproved(_proposalId, msg.sender, p.approvalCount);

        // Attempt automatic execution if threshold is reached
        if (p.approvalCount >= approvalThreshold) {
            _executeProposal(_proposalId);
        }
    }

    /**
     * @notice Cancel a pending proposal (proposer only)
     * @param _proposalId The proposal to cancel
     */
    function cancelProposal(uint256 _proposalId) external onlyCommittee {
        if (_proposalId >= proposalCount) revert ProposalNotFound();

        Proposal storage p = proposals[_proposalId];

        if (p.status != ProposalStatus.Pending) revert ProposalNotPending();
        if (msg.sender != p.proposer) revert OnlyProposerCanCancel();

        p.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(_proposalId, msg.sender);
    }


    // Internal Execution

    /**
     * @dev Internal logic to finalize a passed proposal
     *      Handles member management directly. Other types are flagged as 'Executed'
     *      so external contracts can trigger their specific logic using isProposalExecuted().
     */
    function _executeProposal(uint256 _proposalId) internal {
        Proposal storage p = proposals[_proposalId];
        p.status = ProposalStatus.Executed;

        if (p.actionType == ActionType.ADD_MEMBER) {
            address newMember = abi.decode(p.data, (address));
            _addMember(newMember);
            p.consumed = true;
        } else if (p.actionType == ActionType.REMOVE_MEMBER) {
            address target = abi.decode(p.data, (address));
            _removeMember(target);
            p.consumed = true;
        }
        // External actions: wait for consumeProposal()

        emit ProposalExecuted(_proposalId, p.actionType);
    }

    /**
     * @dev Logic to add a member and recalculate the threshold
     */
    function _addMember(address _member) internal {
        if (_member == address(0)) revert ZeroAddress();
        if (isCommitteeMember[_member]) revert AlreadyMember();
        if (memberCount >= 5) revert MaxMembersReached();

        isCommitteeMember[_member] = true;
        members.push(_member);
        memberCount++;
        approvalThreshold = (memberCount * 2 + 2) / 3;

        emit MemberAdded(_member);
    }

    /**
     * @dev Logic to remove a member, update the threshold, and cleanup the members array
     */
    function _removeMember(address _member) internal {
        if (!isCommitteeMember[_member]) revert NotAMember();
        if (memberCount <= 3) revert MinMembersReached();

        isCommitteeMember[_member] = false;
        memberCount--;
        approvalThreshold = (memberCount * 2 + 2) / 3;

        // Remove from array using the "swap with last and pop" pattern for gas efficiency
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == _member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }

        emit MemberRemoved(_member);
    }

    //External Contract Integration
    /**
     * @notice Called by external contracts to consume an executed proposal.
     * @param _proposalId The proposal to consume
     * @return actionType The action type
     * @return data The ABI-encoded data
     * @dev Security:
     *      1. Only targetContract (msg.sender) can consume
     *      2. Must be Executed status
     *      3. Single-use (consumed flag prevents replay)
     */

     function consumeProposal(uint256 _proposalId)
        external
        returns (ActionType actionType, bytes memory data)
    {
        if (_proposalId >= proposalCount) revert ProposalNotFound();

        Proposal storage p = proposals[_proposalId];

        if (p.status != ProposalStatus.Executed) revert ProposalNotExecuted();
        if (p.targetContract != msg.sender) revert TargetMismatch();
        if (p.consumed) revert ProposalAlreadyConsumed();

        p.consumed = true;

        emit ProposalConsumed(_proposalId, msg.sender);

        return (p.actionType, p.data);
    }


    // View Functions

    /**
     * @notice Checks if a specific proposal has been officially approved and finalized
     * @param _proposalId The ID of the proposal
     * @return True if the proposal state is Executed
     */
    function isProposalExecuted(uint256 _proposalId) external view returns (bool) {
        return proposals[_proposalId].status == ProposalStatus.Executed;
    }

    /**
     * @notice Gets the effective status of a proposal, accounting for expiration
     * @param _proposalId The ID of the proposal
     * @return ProposalStatus The current status (Pending, Executed, Cancelled, or Expired)
     */
    function getEffectiveStatus(uint256 _proposalId) public view returns (ProposalStatus) {
        if (_proposalId >= proposalCount) revert ProposalNotFound();

        Proposal storage p = proposals[_proposalId];
        if (p.status == ProposalStatus.Pending && block.timestamp > p.createdAt + PROPOSAL_TTL) {
            return ProposalStatus.Expired;
        }
        return p.status;
    }

    /**
     * @notice Retrieves the general details of a proposal
     * @param _proposalId The ID of the proposal
     * @return actionType The action type
     * @return targetContract The target contract address
     * @return proposer The proposer address
     * @return approvalCount The number of approvals
     * @return status The current status
     * @return createdAt The timestamp when the proposal was created
     */
    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            ActionType actionType,
            address targetContract,
            address proposer,
            uint256 approvalCount,
            ProposalStatus status,
            uint256 createdAt,
            bool consumed
        )
    {
        if (_proposalId >= proposalCount) revert ProposalNotFound();
        Proposal storage p = proposals[_proposalId];
        ProposalStatus effectiveStatus = getEffectiveStatus(_proposalId);
        return (p.actionType, p.targetContract, p.proposer, p.approvalCount, effectiveStatus, p.createdAt, p.consumed);
    }

    /**
     * @notice Verifies if a specific member has approved a given proposal
     */
    function hasApproved(uint256 _proposalId, address _member) external view returns (bool) {
        return proposals[_proposalId].hasApproved[_member];
    }

    /**
     * @notice Returns the list of all current Committee member addresses
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    /**
     * @notice Returns the current count of Committee members
     */
    function getMemberCount() external view returns (uint256) {
        return memberCount;
    }
}
