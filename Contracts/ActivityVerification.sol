// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


// Interface for GreenToken to mint rewards after approval
interface IGreenToken {
    function mint(address to, uint256 amount) external;

    // Used for performing GT deduction (minority penalty / non-voting penalty)
    function slash(address user, uint256 amount) external returns (uint256 actualAmount);
}

// RewardToken interface, used for majority rewards +1 RT
interface IRewardToken {
    function mint(address to, uint256 amount) external;
}

// Interface for CommitteeManager to verify voter identity and thresholds
interface ICommitteeManager {
    function isCommitteeMember(address user) external view returns (bool);
    function approvalThreshold() external view returns (uint256);
    function getMemberCount() external view returns (uint256);

    // get the member list for validator assignment
    function getMembers() external view returns (address[] memory);
}

contract ActivityVerification is ReentrancyGuard {
    // Custom errors for clear failure reasons
    error NotCommitteeMember();
    error AlreadyVoted();
    error TaskNotPending();
    error TaskNotFound();
    error CannotVoteOnOwnSubmission(); // Prevent self-voting

    // Verifier / Quota / Queuing-related errors
    error NotAssignedVerifier();
    error SubmissionLimitReached();
    error InvalidReward();
    error NothingQueued();
    error QueueNotReady();

    // Task lifecycle status
    enum TaskStatus { Pending, Approved, Rejected }

    // Structure to store activity task details
    struct Task {
        address submitter;   // Student address
        string actionType;   // e.g., "Recycling", "Tree Planting"
        string proofCID;     // IPFS hash for proof image/document
        uint256 gtReward;    // Requested GreenToken amount
        uint256 approvals;   // Vote counter
        uint256 rejections;  // Vote counter
        TaskStatus status;   // Current status
        uint256 timestamp;   // Submission time

        // Voting deadline (12 hours)
        uint256 voteDeadline;

        // If the daily GT limit is exceeded, rewards will be placed in a queue for later redemption
        bool gtQueued;
        bool gtClaimed;

        // Assign 3 verifiers to each task
        address[3] verifiers;
        uint8 verifierCount;
    }

    // External contract instances
    IGreenToken public immutable greenToken;

    // Used to distribute majority rewards RT
    IRewardToken public immutable rewardToken;

    ICommitteeManager public immutable committeeManager;
    
    // State variables
    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // Tracking voters per task

    // Record the direction of the vote to determine the majority or minority
    mapping(uint256 => mapping(address => bool)) public voteChoice;

    // System parameters for verification, incentives, penalties, and constraints
    uint256 public constant verifierReward = 1;      // +1 RT
    uint256 public constant verifierPenalty = 5;     // -5 GT
    uint256 public constant inactivityPenalty = 2;   // -2 GT
    uint256 public constant dailyMintCap = 300;      // 300 GT/day
    uint256 public constant avgGTperTask = 5;        // 5 GT/task
    uint256 public constant maxTasksPerDay = 60;     // 60 tasks/day
    uint256 public constant userTaskLimit = 2;       // 2 submissions/day/user
    uint256 public constant verifierTaskLimit = 8;   // 8 reviews/day/verifier
    uint256 public constant voteDeadlineDuration = 12 hours;

    // Daily statistics
    mapping(uint256 => uint256) public dailyMintedGT;
    mapping(uint256 => uint256) public dailyTaskCount;
    mapping(address => mapping(uint256 => uint256)) public userDailySubmissions;
    mapping(address => mapping(uint256 => uint256)) public verifierDailyAssigned;

    // Events for frontend and indexing
    event TaskSubmitted(uint256 indexed taskId, address indexed submitter, string actionType, uint256 gtReward);
    event VoteCast(uint256 indexed taskId, address indexed voter, bool approve);
    event TaskFinalized(uint256 indexed taskId, TaskStatus status);

    // Verifier assigns and queues reward redemption events
    event VerifiersAssigned(uint256 indexed taskId, address[3] verifiers);
    event QueuedGTClaimed(uint256 indexed taskId, address indexed submitter, uint256 amount);

    // Modifier to restrict access to committee members only
    modifier onlyCommittee() {
        if (!committeeManager.isCommitteeMember(msg.sender)) revert NotCommitteeMember();
        _;
    }

    // Initialize with related contract addresses
    constructor(address _greenToken, address _rewardToken, address _committeeManager) {
        greenToken = IGreenToken(_greenToken);
        rewardToken = IRewardToken(_rewardToken);
        committeeManager = ICommitteeManager(_committeeManager);
    }

    // Calculate the current day and use it for the daily limit.
    function currentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    // Students call this to submit their green activity for verification
    function submitTask(
        string calldata _actionType,
        string calldata _proofCID,
        uint256 _gtReward
    ) external returns (uint256 taskId) {
        uint256 dayKey = currentDay();

        // Set the reward for regular tasks to 5 GT
        if (_gtReward != avgGTperTask) revert InvalidReward();

        // Each user may submit up to 2 tasks per day.
        if (userDailySubmissions[msg.sender][dayKey] >= userTaskLimit) {
            revert SubmissionLimitReached();
        }

        // A maximum of 60 tasks per day across the entire system
        require(dailyTaskCount[dayKey] < maxTasksPerDay, "Daily task cap reached");

        taskId = taskCount++;
        Task storage t = tasks[taskId];
        t.submitter = msg.sender;
        t.actionType = _actionType;
        t.proofCID = _proofCID;
        t.gtReward = _gtReward;
        t.status = TaskStatus.Pending;
        t.timestamp = block.timestamp;

        // Set a 12-hour voting deadline
        t.voteDeadline = block.timestamp + voteDeadlineDuration;

        userDailySubmissions[msg.sender][dayKey]++;
        dailyTaskCount[dayKey]++;

        // Automatically assign 3 verifiers
        _assignVerifiers(taskId);

        emit TaskSubmitted(taskId, msg.sender, _actionType, _gtReward);
        emit VerifiersAssigned(taskId, t.verifiers);
    }

    // Committee members call this to approve or reject a task
    function voteOnTask(uint256 _taskId, bool _approve) external onlyCommittee nonReentrant {
        // Ensure the task exists
        if (_taskId >= taskCount) revert TaskNotFound();
        
        Task storage t = tasks[_taskId];
        
        // Implementation: Submitter cannot be the voter for their own task
        if (msg.sender == t.submitter) revert CannotVoteOnOwnSubmission();

        // Check task status and voting history
        if (t.status != TaskStatus.Pending) revert TaskNotPending();
        if (hasVoted[_taskId][msg.sender]) revert AlreadyVoted();

        // Only assigned verifiers may vote
        if (!_isAssignedVerifier(t, msg.sender)) revert NotAssignedVerifier();

        // Record the vote
        hasVoted[_taskId][msg.sender] = true;

        // Record the direction of votes for use in future majority rewards/minority penalties
        voteChoice[_taskId][msg.sender] = _approve;

        if (_approve) {
            t.approvals++;
        } else {
            t.rejections++;
        }

        emit VoteCast(_taskId, msg.sender, _approve);

        // Get approval threshold from CommitteeManager
        uint256 threshold = committeeManager.approvalThreshold();
        
        // Once the threshold is reached or all three verifiers have cast their votes,
        // the system proceeds to a unified settlement
        if (
            t.approvals >= threshold ||
            t.rejections > (committeeManager.getMemberCount() - threshold) ||
            _allVerifiersVoted(t, _taskId)
        ) {
            _finalizeTask(_taskId, threshold);
        }
    }

    // After the voting period expires, anyone can trigger the settlement process
    function finalizeExpiredTask(uint256 _taskId) external nonReentrant {
        if (_taskId >= taskCount) revert TaskNotFound();

        Task storage t = tasks[_taskId];
        if (t.status != TaskStatus.Pending) revert TaskNotPending();
        require(block.timestamp > t.voteDeadline, "Deadline not reached");

        uint256 threshold = committeeManager.approvalThreshold();
        _finalizeTask(_taskId, threshold);
    }

    // If the daily GT quota is full, you can still claim the waiting-list reward later
    function claimQueuedGT(uint256 _taskId) external nonReentrant {
        if (_taskId >= taskCount) revert TaskNotFound();

        Task storage t = tasks[_taskId];
        uint256 dayKey = currentDay();

        require(msg.sender == t.submitter, "Not submitter");
        if (!t.gtQueued || t.gtClaimed) revert NothingQueued();
        if (dailyMintedGT[dayKey] + t.gtReward > dailyMintCap) revert QueueNotReady();

        dailyMintedGT[dayKey] += t.gtReward;
        t.gtClaimed = true;

        greenToken.mint(t.submitter, t.gtReward);

        emit QueuedGTClaimed(_taskId, msg.sender, t.gtReward);
    }

    // Get the verifier assigned to a specific task
    function getTaskVerifiers(uint256 _taskId) external view returns (address[3] memory) {
        if (_taskId >= taskCount) revert TaskNotFound();
        return tasks[_taskId].verifiers;
    }

    // Internal settlement function
    function _finalizeTask(uint256 _taskId, uint256 threshold) internal {
        Task storage t = tasks[_taskId];

        if (t.approvals >= threshold) {
            // Task Approved: Update status and mint GreenTokens to student
            t.status = TaskStatus.Approved;

            // First, check if the dailyMintCap has been exceeded
            _mintOrQueueGT(t);

            // Settle rewards and penalties after verification
            _settleVerifierRewardsAndPenalties(_taskId, true);

            emit TaskFinalized(_taskId, TaskStatus.Approved);
        } else {
            // Task Rejected: Too many rejections, cannot reach threshold
            t.status = TaskStatus.Rejected;

            // Settle verifier rewards and penalties even after rejection
            _settleVerifierRewardsAndPenalties(_taskId, false);

            emit TaskFinalized(_taskId, TaskStatus.Rejected);
        }
    }

    // If the daily GT quota has not been exceeded, mint immediately; otherwise, join the queue
    function _mintOrQueueGT(Task storage t) internal {
        uint256 dayKey = currentDay();

        if (dailyMintedGT[dayKey] + t.gtReward <= dailyMintCap) {
            dailyMintedGT[dayKey] += t.gtReward;
            t.gtClaimed = true;
            greenToken.mint(t.submitter, t.gtReward);
        } else {
            t.gtQueued = true;
            t.gtClaimed = false;
        }
    }

    // Verifier Rewards And Penalties
    // Majority: +1 RT
    // Minority: -5 GT
    // Abstained: -2 GT
    function _settleVerifierRewardsAndPenalties(uint256 _taskId, bool approved) internal {
        Task storage t = tasks[_taskId];

        for (uint256 i = 0; i < t.verifierCount; i++) {
            address verifier = t.verifiers[i];
            bool voted = hasVoted[_taskId][verifier];

            if (!voted) {
                greenToken.slash(verifier, inactivityPenalty);
                continue;
            }

            bool votedApprove = voteChoice[_taskId][verifier];
            bool inMajority = (approved && votedApprove) || (!approved && !votedApprove);

            if (inMajority) {
                rewardToken.mint(verifier, verifierReward);
            } else {
                greenToken.slash(verifier, verifierPenalty);
            }
        }
    }

    // Assign 3 verifiers and limit each verifier to a maximum of 8 tasks per day
    function _assignVerifiers(uint256 _taskId) internal {
        Task storage t = tasks[_taskId];
        address[] memory members = committeeManager.getMembers();
        uint256 dayKey = currentDay();
        uint8 selected = 0;

        for (uint256 i = 0; i < members.length && selected < 3; i++) {
            address candidate = members[i];

            if (candidate == t.submitter) continue;
            if (verifierDailyAssigned[candidate][dayKey] >= verifierTaskLimit) continue;

            t.verifiers[selected] = candidate;
            verifierDailyAssigned[candidate][dayKey]++;
            selected++;
        }

        require(selected == 3, "Need 3 eligible verifiers");
        t.verifierCount = selected;
    }

    // Determine whether a given address is the verifier for this task
    function _isAssignedVerifier(Task storage t, address user) internal view returns (bool) {
        for (uint256 i = 0; i < t.verifierCount; i++) {
            if (t.verifiers[i] == user) return true;
        }
        return false;
    }

    // Determine whether all verifiers have voted
    function _allVerifiersVoted(Task storage t, uint256 _taskId) internal view returns (bool) {
        for (uint256 i = 0; i < t.verifierCount; i++) {
            if (!hasVoted[_taskId][t.verifiers[i]]) return false;
        }
        return true;
    }
}
