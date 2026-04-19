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
    function approvalThreshold() external view returns (uint256);
    function getMemberCount() external view returns (uint256);
    function isCommitteeMember(address user) external view returns (bool);  // for committeeReplaceVote
}


// use VerifierManager to get verifier list
interface IVerifierManager {
    function getCandidates() external view returns (address[] memory); // Get candidate reviewers
    function reportPerformance(address _verifier, bool _isCorrect) external; // Update verifier performance
    function incrementRound() external; // Move system round forward
    function slashFromStake(address _verifier, uint256 _amount) external returns (uint256 deducted); // Slash stake first and return actual deducted amount
    function onTaskAssigned(address _verifier) external;   // lock verifier when assigned
    function onTaskFinalized(address _verifier) external;  // unlock verifier when task done
}



contract ActivityVerification is ReentrancyGuard {
    // Custom errors for clear failure reasons
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
    error TaskInCooldown();
    error NotCommitteeMember();
    error VerifierAlreadyVoted();
    error InvalidVerifierSlot();


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

    // VerifierManager — provides phase-aware candidate pool + performance tracking
    IVerifierManager public immutable verifierManager;
    
    // State variables
    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // Tracking voters per task

    // Record the direction of the vote to determine the majority or minority
    mapping(uint256 => mapping(address => bool)) public voteChoice;

    // Track verifier slots where committee stepped in after deadline
    mapping(uint256 => mapping(address => bool)) public wasReplaced;


    //  18 decimals
    uint256 public constant UNIT = 1e18;

    // System parameters for verification, incentives, penalties, and constraints
    uint256 public constant verifierReward = 1* UNIT;      // +1 RT
    uint256 public constant verifierPenalty = 5* UNIT;     // -5 GT
    uint256 public constant inactivityPenalty = 2* UNIT;   // -2 GT
    uint256 public constant dailyMintCap = 300* UNIT;      // 300 GT/day
    uint256 public constant avgGTperTask = 5* UNIT;        // 5 GT/task
    uint256 public constant maxTasksPerDay = 60;     // 60 tasks/day
    uint256 public constant userTaskLimit = 2;       // 2 submissions/day/user
    uint256 public constant verifierTaskLimit = 8;   // 8 reviews/day/verifier
    uint256 public constant voteDeadlineDuration = 12 hours;
    uint256 public constant taskCooldown = 24 hours; //24-hour cooldown before voting begins
    uint256 public constant APPROVAL_THRESHOLD = 2; //Approval threshold for 3-verifier model: 2 out of 3

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

    // Committee steps in to vote on behalf of absent verifier
    event CommitteeReplacedVote(uint256 indexed taskId, address indexed committeeMember, address indexed absentVerifier, bool approve);

    // Initialize with related contract addresses
    constructor(
        address _greenToken, 
        address _rewardToken, 
        address _committeeManager,
        address _verifierManager
    ) {
        greenToken = IGreenToken(_greenToken);
        rewardToken = IRewardToken(_rewardToken);
        committeeManager = ICommitteeManager(_committeeManager);
        verifierManager = IVerifierManager(_verifierManager);
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

        //Voting deadline = cooldown + vote window = 24+12 =36 h 
        t.voteDeadline = block.timestamp + taskCooldown + voteDeadlineDuration;

        userDailySubmissions[msg.sender][dayKey]++;
        dailyTaskCount[dayKey]++;

        // Automatically assign 3 verifiers
        _assignVerifiers(taskId);

        emit TaskSubmitted(taskId, msg.sender, _actionType, _gtReward);
        emit VerifiersAssigned(taskId, t.verifiers);
    }

    // Assigned verifiers call this to approve or reject a task
    // No onlyCommittee — access is controlled solely by _isAssignedVerifier()
    function voteOnTask(uint256 _taskId, bool _approve) external nonReentrant {
        // Ensure the task exists
        if (_taskId >= taskCount) revert TaskNotFound();
        
        Task storage t = tasks[_taskId];
        
        // Implementation: Submitter cannot be the voter for their own task
        if (msg.sender == t.submitter) revert CannotVoteOnOwnSubmission();

        // Check task status and voting history
        if (t.status != TaskStatus.Pending) revert TaskNotPending();
        if (hasVoted[_taskId][msg.sender]) revert AlreadyVoted();

        //Enforce 24h cooldown before voting is allowed
        if (block.timestamp < t.timestamp + taskCooldown) revert TaskInCooldown();
        
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

        // Fixed threshold for 3-verifier model
        // Verifiers are now a separate pool from committee, so we use a local constant
        if (
            t.approvals >= APPROVAL_THRESHOLD ||
            t.rejections > (3 - APPROVAL_THRESHOLD) ||
            _allVerifiersVoted(t, _taskId)
        ) {
            _finalizeTask(_taskId);
        }
    }


    // After the voting period expires, anyone can trigger the settlement process
    function finalizeExpiredTask(uint256 _taskId) external nonReentrant {
        if (_taskId >= taskCount) revert TaskNotFound();

        Task storage t = tasks[_taskId];
        if (t.status != TaskStatus.Pending) revert TaskNotPending();
        require(block.timestamp > t.voteDeadline, "Deadline not reached");

        _finalizeTask(_taskId);
    }

    // Committee member votes in place of a verifier who failed to vote
    function committeeReplaceVote(
        uint256 _taskId,
        uint256 _verifierSlot,
        bool _approve
    ) external nonReentrant {
        if (_taskId >= taskCount) revert TaskNotFound();
        Task storage t = tasks[_taskId];
        if (t.status != TaskStatus.Pending) revert TaskNotPending();

        // Only committee members
        if (!committeeManager.isCommitteeMember(msg.sender)) revert NotCommitteeMember();

        // Must be past vote deadline (committee steps in after verifier fails)
        require(block.timestamp > t.voteDeadline, "Deadline not reached");

        // Validate verifier slot
        if (_verifierSlot >= t.verifierCount) revert InvalidVerifierSlot();
        address absentVerifier = t.verifiers[_verifierSlot];

        // Absent verifier must NOT have voted
        if (hasVoted[_taskId][absentVerifier]) revert VerifierAlreadyVoted();

        // Mark as voted (so _allVerifiersVoted works) + mark as replaced (for penalty logic)
        hasVoted[_taskId][absentVerifier] = true;
        wasReplaced[_taskId][absentVerifier] = true;
        voteChoice[_taskId][absentVerifier] = _approve;

        if (_approve) {
            t.approvals++;
        } else {
            t.rejections++;
        }

        emit CommitteeReplacedVote(_taskId, msg.sender, absentVerifier, _approve);

        // Check if threshold reached
        if (
            t.approvals >= APPROVAL_THRESHOLD ||
            t.rejections > (3 - APPROVAL_THRESHOLD) ||
            _allVerifiersVoted(t, _taskId)
        ) {
            _finalizeTask(_taskId);
        }
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

    // use stake and then use verifier's wallet
    function _burnVerifierGT(address _verifier, uint256 _amount) internal{

        // Slash stake first
        uint256 deductedFromStake = verifierManager.slashFromStake(_verifier, _amount);
        
        uint256 remaining = _amount - deductedFromStake; // calculate left penalty

        
        
        if (remaining > 0) { greenToken.slash(_verifier, remaining); } // if stake is not enough
    }

    // Get the verifier assigned to a specific task
    function getTaskVerifiers(uint256 _taskId) external view returns (address[3] memory) { 
        if (_taskId >= taskCount) revert TaskNotFound();
        return tasks[_taskId].verifiers;
    }

    // Internal settlement function
    function _finalizeTask(uint256 _taskId) internal {

        Task storage t = tasks[_taskId];
        bool approved = t.approvals >= APPROVAL_THRESHOLD;

        if (approved) {
            // Task Approved: Update status and mint GreenTokens to student
            t.status = TaskStatus.Approved;
            _mintOrQueueGT(t);
        } else {
            // Task Rejected: Too many rejections, cannot reach threshold
            t.status = TaskStatus.Rejected;
        }
        // Settle verifier rewards/penalties and report to VerifierManager
        _settleVerifierRewardsAndPenalties(_taskId, approved);

        // Advance the global round counter in VerifierManager
        verifierManager.incrementRound();

        emit TaskFinalized(_taskId, t.status);
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

    // Verifier Rewards And Penalties(from stake)
    // Majority: +1 RT
    // Minority: -5 GT
    // Abstained: -2 GT
    function _settleVerifierRewardsAndPenalties(uint256 _taskId, bool approved) internal {
        Task storage t = tasks[_taskId];

        for (uint256 i = 0; i < t.verifierCount; i++) {
            address verifier = t.verifiers[i];
            
            if (wasReplaced[_taskId][verifier]) {
                _burnVerifierGT(verifier, inactivityPenalty);
                verifierManager.reportPerformance(verifier, false);
                verifierManager.onTaskFinalized(verifier);   // release task lock
                continue;
            }
            
            bool voted = hasVoted[_taskId][verifier];

            if (!voted) {
                _burnVerifierGT(verifier, inactivityPenalty);
                verifierManager.reportPerformance(verifier, false);
                verifierManager.onTaskFinalized(verifier); 
                continue;
            }

            bool votedApprove = voteChoice[_taskId][verifier];
            bool inMajority = (approved && votedApprove) || (!approved && !votedApprove);

            if (inMajority) {
                rewardToken.mint(verifier, verifierReward);
                verifierManager.reportPerformance(verifier, true);
            } else {
                _burnVerifierGT(verifier, verifierPenalty);
                verifierManager.reportPerformance(verifier, false);
            }

            verifierManager.onTaskFinalized(verifier);  
            
        }
    }

    //reads candidates from VerifierManager.getCandidates()
    //Random verifier selection (was sequential)
    // use keccak256 generator to assign verifiers in a pseudo-random index
    // Assign 3 verifiers and limit each verifier to a maximum of 8 tasks per day
    function _assignVerifiers(uint256 _taskId) internal {
        Task storage t = tasks[_taskId];

        address[] memory members = verifierManager.getCandidates();
        uint256 dayKey = currentDay();
        uint8 selected = 0;
        uint256 len = members.length;

        // Generate pseudo-random starting index using block context + taskId
        uint256 startIndex = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _taskId))
        ) % len;

        for (uint256 i = 0; i < len && selected < 3; i++) {
            uint256 idx = (startIndex + i) % len; //wrap-around index
            address candidate = members[idx];

            if (candidate == t.submitter) continue;
            if (verifierDailyAssigned[candidate][dayKey] >= verifierTaskLimit) continue;

            t.verifiers[selected] = candidate;
            verifierDailyAssigned[candidate][dayKey]++;
            selected++;

            verifierManager.onTaskAssigned(candidate);
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
