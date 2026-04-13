// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Module 1:Verifier Access & Identity Management
interface ICommitteeManager {
    function isCommitteeMember(address user) external view returns (bool);
}

contract VerifierManager is ReentrancyGuard {
    error ThresholdNotMet();       // not enough GT
    error AlreadyVerifier();       
    error NotAVerifier();          
    error InSuspension(uint256 until); // suspension duration
    error InCooldown(uint256 rounds);   // cooldown period
    error ConsecutiveLimitReached();    // three times in a row
    error TransferFailed();        

    uint256 public constant VERIFIER_THRESHOLD = 100 ; // threshold
    uint256 public constant STAKE_AMOUNT = 100 ;      // Pledge amount
    uint256 public constant MAX_CONSECUTIVE = 3;           // continuously select upper limit
    uint256 public constant COOLDOWN_ROUNDS = 2;            // cooldown rounds
    uint256 public constant SUSPENSION_DURATION = 3 days;  // suspension duration

    struct Verifier {
        uint256 stakedGT;          // Number of pledges
        uint256 consecutiveCount;  // Counting continuous processing
        uint256 lastTaskBlock;     // last time for processing
        uint256 errorCounter;      // Counting wrong votes
        uint256 suspensionEnd;     // Deadline for suspension
        bool isActive;             
    }

    IERC20 public immutable greenToken;
    ICommitteeManager public immutable committee;
    
    mapping(address => Verifier) public verifiers;
    address[] public verifierList; 

    event VerifierJoined(address indexed verifier, uint256 stakedAmount);
    event VerifierSuspended(address indexed verifier, uint256 until);
    event PerformanceUpdated(address indexed verifier, bool isCorrect, uint256 newErrorCount);

    constructor(address _gt, address _committee) {
        greenToken = IERC20(_gt);
        committee = ICommitteeManager(_committee);
    }

    function joinVerifierPool() external nonReentrant {
        // 1. check 100 GT
        if (greenToken.balanceOf(msg.sender) < VERIFIER_THRESHOLD) revert ThresholdNotMet();
        if (verifiers[msg.sender].isActive) revert AlreadyVerifier();

        // 2. lock 100Gt
        if (!greenToken.transferFrom(msg.sender, address(this), STAKE_AMOUNT)) revert TransferFailed();

        // 3. initialize
        verifiers[msg.sender] = Verifier({
            stakedGT: STAKE_AMOUNT,
            consecutiveCount: 0,
            lastTaskBlock: 0,
            errorCounter: 0,
            suspensionEnd: 0,
            isActive: true
        });
        
        verifierList.push(msg.sender);
        emit VerifierJoined(msg.sender, STAKE_AMOUNT);
    }

    // Qualification judgement
    function isEligible(address _user) public view returns (bool) {
        Verifier storage v = verifiers[_user];
        
        // active and already pledged
        if (!v.isActive) return false;
        
        // check Suspension
        if (block.timestamp < v.suspensionEnd) return false;
        
        // check Max Consecutive Selection
        if (v.consecutiveCount >= MAX_CONSECUTIVE) return false;
        
        
        return true;
    }

    function reportPerformance(address _verifier, bool _isCorrect) external {
        // require(msg.sender == address(activityVerification), "Unauthorized");

        Verifier storage v = verifiers[_verifier];
        if (!v.isActive) return;

        if (_isCorrect) {
            v.errorCounter = 0; // Reset the error count
            v.consecutiveCount++; // Add selected count
        } else {
            v.errorCounter++;
            v.consecutiveCount = 0; // Reset the selected count when there is an error
            
            // Suspension
            if (v.errorCounter >= 3) {
                v.suspensionEnd = block.timestamp + SUSPENSION_DURATION;
                v.errorCounter = 0;
                emit VerifierSuspended(_verifier, v.suspensionEnd);
            }
        }
        
        emit PerformanceUpdated(_verifier, _isCorrect, v.errorCounter);
    }

    function getLockedStake(address _user) external view returns (uint256) {
        return verifiers[_user].stakedGT;
    }
}