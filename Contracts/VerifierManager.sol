// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


// Module 1:Verifier Access & Identity Management
interface ICommitteeManager {
    function isCommitteeMember(address user) external view returns (bool);
    function getMembers() external view returns (address[] memory);
}


contract VerifierManager is ReentrancyGuard {
    error ThresholdNotMet();       // not enough GT
    error AlreadyVerifier();       
    error NotAVerifier();     
    error InSuspension(uint256 until); // suspension duration
    error InCooldown(uint256 rounds);   // cooldown period
    error ConsecutiveLimitReached();    // three times in a row
    error TransferFailed();
    error Unauthorized();     
    error AlreadySet();   
    error InvalidAddress();
    error ActiveTasksPending(); //cannot exit while assigned to pending tasks

    uint256 public constant VERIFIER_THRESHOLD = 100 ; // threshold
    uint256 public constant STAKE_AMOUNT = 100 ;      // Pledge amount
    uint256 public constant MIN_STAKE = 80; //below this could not be verifier
    uint256 public constant MAX_CONSECUTIVE = 3;           // continuously select upper limit
    uint256 public constant COOLDOWN_ROUNDS = 2;            // cooldown rounds
    uint256 public constant SUSPENSION_DURATION = 3 days;  // suspension duration

    // Phase thresholds
    uint256 public constant PHASE2_THRESHOLD = 5;   // >= 5 active verifiers -> Phase 2
    uint256 public constant PHASE3_THRESHOLD = 10;  // >= 10 active verifiers -> Phase 3

    enum GovernancePhase {
        Phase1,           // Committee-only review
        Phase2,           // Mixed: committee + verifier pool
        Phase3            // Verifier pool only
    }
    
    struct Verifier {
        uint256 stakedGT;          // Number of pledges
        uint256 consecutiveCount;  // Counting continuous processing
        uint256 lastTaskBlock;     // last time for processing
        uint256 cooldownUntilRound; // Skip selection until this round number
        uint256 errorCounter;      // Counting wrong votes
        uint256 suspensionEnd;     // Deadline for suspension
        bool isActive;             
    }

    IERC20 public immutable greenToken; // save GT token contract
    ICommitteeManager public immutable committee;
    
    // Only ActivityVerification can call reportPerformance
    address public activityVerification;

    mapping(address => Verifier) public verifiers;
    address[] public verifierList; 

    // Track how many pending tasks each verifier is assigned to
    mapping(address => uint256) public activeTaskCount;

    // Global round counter — incremented each time a task is finalized
    uint256 public currentRound;

    // Current governance phase — auto-updated on join/leave
    GovernancePhase public currentPhase;

    event VerifierJoined(address indexed verifier, uint256 stakedAmount);
    event VerifierLeft(address indexed verifier, uint256 returnedAmount);
    event VerifierSuspended(address indexed verifier, uint256 until);
    event PerformanceUpdated(address indexed verifier, bool isCorrect, uint256 newErrorCount, uint256 lastTaskBlock);
    event PhaseUpdated(GovernancePhase newPhase);
    event ActivityVerificationSet(address indexed av);

    event StakeSituation(
        address indexed verifier, // Save which verifier lost stake.
        uint256 requestedAmount, // Save how much the system wanted to slash.
        uint256 actualAmount, // Save how much stake was really slashed.
        uint256 remainingStake // Save how much stake is left after slashing.
    );

    // Verifier auto-removed because stake < 80 and all tasks done
    event VerifierAutoRemoved(address indexed verifier, uint256 returnedStake);

    constructor(address _gt, address _committee) {
        greenToken = IERC20(_gt);  // save GT token address
        committee = ICommitteeManager(_committee);
        currentPhase = GovernancePhase.Phase1;
    }

    // Only ActivityVerification can call this.
    modifier onlyActivityVerification() {
        if (msg.sender != activityVerification) revert Unauthorized(); // Reject all other callers.
        _;
    }

    function setActivityVerification(address _av) external {
        require(msg.sender == address(committee), "Only committee");
        if (activityVerification != address(0)) revert AlreadySet();
        if (_av == address(0)) revert InvalidAddress();
        activityVerification = _av;
        emit ActivityVerificationSet(_av);
    }




    function joinVerifierPool() external nonReentrant {
        // check 100 GT
        if (greenToken.balanceOf(msg.sender) < VERIFIER_THRESHOLD) revert ThresholdNotMet();
        if (verifiers[msg.sender].isActive) revert AlreadyVerifier();

        // lock 100Gt
        if (!greenToken.transferFrom(msg.sender, address(this), STAKE_AMOUNT)) revert TransferFailed();

        // initialize
        verifiers[msg.sender] = Verifier({
            stakedGT: STAKE_AMOUNT,
            consecutiveCount: 0,
            lastTaskBlock: 0,
            cooldownUntilRound: 0,
            errorCounter: 0,
            suspensionEnd: 0,
            isActive: true
        });
        
        verifierList.push(msg.sender);
        emit VerifierJoined(msg.sender, STAKE_AMOUNT);

        _updatePhase();
    }

    function leaveVerifierPool() external nonReentrant {
        Verifier storage v = verifiers[msg.sender];
        if (!v.isActive) revert NotAVerifier();

        // Block exit if verifier has active (pending) tasks
        if (activeTaskCount[msg.sender] > 0) revert ActiveTasksPending();

        uint256 staked = v.stakedGT;
        _removeVerifier(msg.sender);

        // Return staked GT
        if (staked > 0) {
            greenToken.transfer(msg.sender, staked);
        }

        emit VerifierLeft(msg.sender, staked);
    }

    function onTaskAssigned(address _verifier) external onlyActivityVerification {
        activeTaskCount[_verifier]++;
    }

    function onTaskFinalized(address _verifier) external onlyActivityVerification {
        if (activeTaskCount[_verifier] > 0) {
            activeTaskCount[_verifier]--;
        }

        //   If stake dropped below 80 during earlier slashes but verifier
        //   still had pending tasks, removal was deferred. Now that all tasks are done,
        //   execute the removal and return remaining GT.
        Verifier storage v = verifiers[_verifier];
        if (v.isActive && v.stakedGT < MIN_STAKE && activeTaskCount[_verifier] == 0) {
            uint256 remaining = v.stakedGT;
            _removeVerifier(_verifier);

            if (remaining > 0) {
                greenToken.transfer(_verifier, remaining);
            }

            emit VerifierAutoRemoved(_verifier, remaining);
        }
    }

    // slash locked stake
    function slashFromStake(address _verifier, uint256 _amount) external onlyActivityVerification returns(uint256 deducted) {
        if (_amount == 0) { return 0; } // do nothing if 0

        // Load this verifier's data
        Verifier storage v = verifiers[_verifier];  

        // Read current locked GT
        uint256 currentStake = v.stakedGT;

        // If this verifier has no stake, return zero
        if (currentStake == 0) { return 0; }

        // Slash the smaller one
        deducted = currentStake < _amount ? currentStake : _amount;

        // Update remaining locked stake 
        v.stakedGT = currentStake - deducted;

    

        // record this 
        emit StakeSituation( _verifier, _amount, deducted, v.stakedGT);

        if (v.isActive && v.stakedGT < MIN_STAKE) {
            if (activeTaskCount[_verifier] == 0) {
                // No pending tasks: immediately remove and return remaining GT
                uint256 remaining = v.stakedGT;
                _removeVerifier(_verifier);

                if (remaining > 0) {
                    greenToken.transfer(_verifier, remaining);
                }

                emit VerifierAutoRemoved(_verifier, remaining);
            }
            // else: defer removal — onTaskFinalized will handle it when tasks clear
        }

    }



    // Qualification judgement
    /**
     * @notice Check if a verifier is eligible for task assignment right now
     * @dev Checks: active, not suspended, not at consecutive limit, not in cooldown
     */
    function isEligible(address _user) public view returns (bool) {
        Verifier storage v = verifiers[_user];
        
        // active and already pledged
        if (!v.isActive) return false;
        
        // Must still have sufficient stake for new task assignment
        if (v.stakedGT < MIN_STAKE) return false;

        // check Suspension
        if (block.timestamp < v.suspensionEnd) return false;
        
        // check Max Consecutive Selection
        if (v.consecutiveCount >= MAX_CONSECUTIVE) {
            // In cooldown — check if enough rounds have passed
            if (currentRound < v.cooldownUntilRound) return false;
        }
        
        return true;
    }


    function getCandidates() external view returns (address[] memory) {
        if (currentPhase == GovernancePhase.Phase1) {
            // Not enough verifiers — use committee members as reviewers
            return committee.getMembers();
        }

        if (currentPhase == GovernancePhase.Phase3) {
            // Mature DAO — only verifier pool
            return _getEligibleVerifiers();
        }

        // Phase 2 — merge committee + verifiers, deduplicate
        address[] memory committeeMembers = committee.getMembers();
        address[] memory eligibleVerifiers = _getEligibleVerifiers();

        // Worst case: all are unique
        address[] memory merged = new address[](committeeMembers.length + eligibleVerifiers.length);
        uint256 count = 0;

        // Add committee members first
        for (uint256 i = 0; i < committeeMembers.length; i++) {
            merged[count++] = committeeMembers[i];
        }

        // Add verifiers that are not already committee members
        for (uint256 i = 0; i < eligibleVerifiers.length; i++) {
            bool isDuplicate = false;
            for (uint256 j = 0; j < committeeMembers.length; j++) {
                if (eligibleVerifiers[i] == committeeMembers[j]) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                merged[count++] = eligibleVerifiers[i];
            }
        }

        // Trim to actual size
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = merged[i];
        }
        return result;
    }

    // Performance Reporting (called by AV after finalization)
    function reportPerformance(address _verifier, bool _isCorrect) external {
        if (msg.sender != activityVerification) revert Unauthorized();
        
        Verifier storage v = verifiers[_verifier];
        if (!v.isActive) return;

        if (_isCorrect) {
            v.errorCounter = 0; // Reset the error count
            v.consecutiveCount++; // Add selected count

            if (v.consecutiveCount >= MAX_CONSECUTIVE) {
                v.cooldownUntilRound = currentRound + COOLDOWN_ROUNDS;
                // consecutiveCount stays at MAX — isEligible will check cooldownUntilRound
            }
        } else {
            v.cooldownUntilRound = 0; // Reset cooldown on error
            v.errorCounter++;
            v.consecutiveCount = 0; // Reset the selected count when there is an error

            // Suspension
            if (v.errorCounter >= 3) {
                v.suspensionEnd = block.timestamp + SUSPENSION_DURATION;
                v.errorCounter = 0;
                emit VerifierSuspended(_verifier, v.suspensionEnd);
            }
        }

        v.lastTaskBlock = block.number;
        
        emit PerformanceUpdated(_verifier, _isCorrect, v.errorCounter, v.lastTaskBlock);
    }

    function incrementRound() external {
        if (msg.sender != activityVerification) revert Unauthorized();
        currentRound++;
    }

    //View Functions

    function getVerifierList() external view returns (address[] memory) {
        return verifierList;
    }

    function getActiveVerifierCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < verifierList.length; i++) {
            if (verifiers[verifierList[i]].isActive) count++;
        }
        return count;
    }

    function getLockedStake(address _user) external view returns (uint256) {
        return verifiers[_user].stakedGT;
    }

    function getPhase() external view returns (GovernancePhase) {
        return currentPhase;
    }

    function _removeVerifier(address _verifier) internal {
        verifiers[_verifier].isActive = false;
        verifiers[_verifier].stakedGT = 0;

        // Swap-and-pop from verifierList
        for (uint256 i = 0; i < verifierList.length; i++) {
            if (verifierList[i] == _verifier) {
                verifierList[i] = verifierList[verifierList.length - 1];
                verifierList.pop();
                break;
            }
        }

        _updatePhase();
    }
    
    function _getEligibleVerifiers() internal view returns (address[] memory) {
        // First pass: count eligible
        uint256 count = 0;
        for (uint256 i = 0; i < verifierList.length; i++) {
            if (isEligible(verifierList[i])) count++;
        }

        // Second pass: collect
        address[] memory result = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < verifierList.length; i++) {
            if (isEligible(verifierList[i])) {
                result[idx++] = verifierList[i];
            }
        }
        return result;
    }

    function _updatePhase() internal {
        uint256 active = getActiveVerifierCount();
        GovernancePhase newPhase;

        if (active >= PHASE3_THRESHOLD) {
            newPhase = GovernancePhase.Phase3;
        } else if (active >= PHASE2_THRESHOLD) {
            newPhase = GovernancePhase.Phase2;
        } else {
            newPhase = GovernancePhase.Phase1;
        }

        if (newPhase != currentPhase) {
            currentPhase = newPhase;
            emit PhaseUpdated(newPhase);
        }
    }

}
    