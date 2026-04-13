// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Governance {

    // Defines system stages from centralized committee control to decentralized DAO evolution with an emergency fallback mode.
    enum GovernancePhase {
        Phase1, // Initial phase with committee control and GT distribution.
        Phase2, // Intermediate phase with mixed committee and qualified verifier participation.
        Phase3, // Final phase with decentralized governance by qualified verifiers.
        ManualGovernance // Emergency mode with committee control for critical interventions.
    }

    GovernancePhase public currentPhase;

    // Stores addresses that have administrative privileges during bootstrap and emergency governance.
    mapping(address => bool) public committeeMembers;

    modifier onlyCommittee() {
        require(committeeMembers[msg.sender], "Not committee");
        _;
    }

    // Tracks internal GT balances for users without integrating a full ERC20 token.
    mapping(address => uint256) public GTBalance;

    uint256 public constant MIN_INITIAL_GT = 20;
    uint256 public constant MAX_INITIAL_GT = 50;

    // Defines verifier qualification threshold and tracks eligible verifier accounts.
    uint256 public verifierThreshold = 100;

    mapping(address => bool) public qualifiedVerifier;
    uint256 public qualifiedCount;

    // Represents governance proposals including voting results and execution state.
    struct Proposal {
        uint256 id;
        string description;
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        bool active;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    // Prevents double voting by tracking whether an address has voted on a proposal.
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event CommitteeAdded(address indexed user);
    event CommitteeRemoved(address indexed user);

    event InitialGTGranted(address indexed user, uint256 amount);
    event GTAdded(address indexed user, uint256 amount);

    event VerifierQualified(address indexed user);
    event VerifierRemoved(address indexed user);
    event PhaseUpdated(GovernancePhase newPhase);

    event ManualGovernanceTriggered(string reason);
    event ManualGovernanceDisabled();

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    // Initializes the contract by assigning the deployer as the first committee member and setting the initial phase.
    constructor() {
        committeeMembers[msg.sender] = true;
        currentPhase = GovernancePhase.Phase1;
    }

    function addCommittee(address user) external onlyCommittee {
        require(user != address(0), "Invalid address");
        require(!committeeMembers[user], "Already committee");

        committeeMembers[user] = true;
        emit CommitteeAdded(user);
    }

    function removeCommittee(address user) external onlyCommittee {
        require(user != address(0), "Invalid address");
        require(committeeMembers[user], "Not committee");
        require(user != msg.sender, "Cannot remove self");

        committeeMembers[user] = false;
        emit CommitteeRemoved(user);
    }

    // Grants initial GT within a bounded range to bootstrap user participation.
    function grantInitialGT(address user, uint256 amount) external onlyCommittee {
        require(user != address(0), "Invalid address");
        require(amount >= MIN_INITIAL_GT && amount <= MAX_INITIAL_GT, "Invalid GT range");

        GTBalance[user] += amount;

        emit InitialGTGranted(user, amount);

        _checkQualification(user);
        _updatePhase();
    }

    // Adds GT for testing or reward simulation purposes.
    function addGT(address user, uint256 amount) external onlyCommittee {
        require(user != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");

        GTBalance[user] += amount;

        emit GTAdded(user, amount);

        _checkQualification(user);
        _updatePhase();
    }

    // Removes GT and updates verifier status dynamically when balance drops below the threshold.
    function deductGT(address user, uint256 amount) external onlyCommittee {
        require(user != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");
        require(GTBalance[user] >= amount, "Insufficient GT");

        GTBalance[user] -= amount;

        _checkQualification(user);
        _updatePhase();
    }

    // Updates verifier status by promoting users above the threshold and demoting users below it.
    function _checkQualification(address user) internal {
        if (GTBalance[user] >= verifierThreshold && !qualifiedVerifier[user]) {
            qualifiedVerifier[user] = true;
            qualifiedCount++;
            emit VerifierQualified(user);
        } else if (GTBalance[user] < verifierThreshold && qualifiedVerifier[user]) {
            qualifiedVerifier[user] = false;
            qualifiedCount--;
            emit VerifierRemoved(user);
        }
    }

    function checkQualification(address user) external {
        require(user != address(0), "Invalid address");
        _checkQualification(user);
        _updatePhase();
    }

    // Automatically updates governance phase based on the number of qualified verifiers unless the system is in manual governance mode.
    function _updatePhase() internal {
        if (currentPhase == GovernancePhase.ManualGovernance) {
            return;
        }

        GovernancePhase oldPhase = currentPhase;

        if (qualifiedCount >= 10) {
            currentPhase = GovernancePhase.Phase3;
        } else if (qualifiedCount >= 5) {
            currentPhase = GovernancePhase.Phase2;
        } else {
            currentPhase = GovernancePhase.Phase1;
        }

        if (oldPhase != currentPhase) {
            emit PhaseUpdated(currentPhase);
        }
    }

    function updatePhase() external {
        _updatePhase();
    }

    // Enables emergency governance mode controlled entirely by committee members.
    function triggerManualGovernance(string calldata reason) external onlyCommittee {
        currentPhase = GovernancePhase.ManualGovernance;
        emit ManualGovernanceTriggered(reason);
    }

    // Restores the system to normal phase logic after emergency governance ends.
    function disableManualGovernance() external onlyCommittee {
        require(currentPhase == GovernancePhase.ManualGovernance, "Not in manual mode");

        if (qualifiedCount >= 10) {
            currentPhase = GovernancePhase.Phase3;
        } else if (qualifiedCount >= 5) {
            currentPhase = GovernancePhase.Phase2;
        } else {
            currentPhase = GovernancePhase.Phase1;
        }

        emit ManualGovernanceDisabled();
        emit PhaseUpdated(currentPhase);
    }

    // Creates a governance proposal and restricts proposal creation to committee members only in all phases.
    function createProposal(string calldata description) external returns (uint256) {
        require(bytes(description).length > 0, "Empty description");
        require(committeeMembers[msg.sender], "Only committee can propose");

        proposalCount++;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            description: description,
            proposer: msg.sender,
            yesVotes: 0,
            noVotes: 0,
            executed: false,
            active: true
        });

        emit ProposalCreated(proposalCount, msg.sender, description);

        return proposalCount;
    }

    // Allows voting on proposals and restricts voting rights to committee members only in all phases.
    function voteProposal(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];

        require(p.id != 0, "Proposal does not exist");
        require(p.active, "Proposal is not active");
        require(!p.executed, "Proposal already executed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(committeeMembers[msg.sender], "Only committee can vote");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.yesVotes++;
        } else {
            p.noVotes++;
        }

        emit ProposalVoted(proposalId, msg.sender, support);
    }

    // Executes a proposal and determines whether it passed based on yes and no vote counts.
    function executeProposal(uint256 proposalId) external onlyCommittee {
        Proposal storage p = proposals[proposalId];

        require(p.id != 0, "Proposal does not exist");
        require(p.active, "Proposal is not active");
        require(!p.executed, "Proposal already executed");

        p.executed = true;
        p.active = false;

        bool passed = p.yesVotes > p.noVotes;

        emit ProposalExecuted(proposalId, passed);
    }

    function isCommittee(address user) external view returns (bool) {
        return committeeMembers[user];
    }

    function isVerifier(address user) external view returns (bool) {
        return qualifiedVerifier[user];
    }

    function getGT(address user) external view returns (uint256) {
        return GTBalance[user];
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 id,
            string memory description,
            address proposer,
            uint256 yesVotes,
            uint256 noVotes,
            bool executed,
            bool active
        )
    {
        Proposal memory p = proposals[proposalId];
        return (
            p.id,
            p.description,
            p.proposer,
            p.yesVotes,
            p.noVotes,
            p.executed,
            p.active
        );
    }
}