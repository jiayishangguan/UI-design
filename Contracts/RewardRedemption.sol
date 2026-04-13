// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// B-15

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Use these interfaces to interact with RewardToken and AMMPool
interface IRewardToken {
    function burnFrom(address account, uint256 amount) external;
}

interface IAMMPool {
    function targetRT() external view returns (uint256);
    function getReserves() external view returns (uint256 gt, uint256 rt, uint256 currentK);
}

interface ICommitteeManager {
    function isCommitteeMember(address user) external view returns (bool);
}

contract RewardRedemption is ReentrancyGuard {
    // Custom errors for gas efficiency
    error NotCommitteeMember();
    error RewardNotActive();
    error InsufficientReserves();

    // Define Reward structure
    struct Reward {
        string name;       // Reward item name
        uint256 baseCost;  // Cost when RT reserve is at target
        bool active;       // Reward availability
    }

    // Contract instances
    IRewardToken public immutable rewardToken;
    IAMMPool public immutable ammPool;
    ICommitteeManager public immutable committeeManager;

    // Save rewards in a mapping
    mapping(uint256 => Reward) public rewards;
    uint256 public nextRewardId;

    // Events for logging
    event RewardAdded(uint256 indexed id, string name, uint256 baseCost);
    event RewardRemoved(uint256 indexed id);
    event RewardRedeemed(address indexed user, uint256 indexed rewardId, uint256 cost);

    // Modifier to check if caller is a committee member
    modifier onlyCommittee() {
        if (!committeeManager.isCommitteeMember(msg.sender)) revert NotCommitteeMember();
        _;
    }

    // Set contract addresses during deployment
    constructor(address _rt, address _amm, address _committee) {
        rewardToken = IRewardToken(_rt);
        ammPool = IAMMPool(_amm);
        committeeManager = ICommitteeManager(_committee);
    }

    // Committee adds a new reward to the catalog
    function addReward(string calldata _name, uint256 _baseCost) external onlyCommittee {
        rewards[nextRewardId] = Reward(_name, _baseCost, true);
        emit RewardAdded(nextRewardId, _name, _baseCost);
        nextRewardId++;
    }

    // Committee disables an existing reward
    function removeReward(uint256 _id) external onlyCommittee {
        rewards[_id].active = false;
        emit RewardRemoved(_id);
    }

    // B-15 Core: Calculate dynamic cost based on RT reserves
    // Formula: (baseCost * targetRT) / currentRT
    // When currentRT is low, the cost will increase automatically.
    function getCurrentCost(uint256 _id) public view returns (uint256) {
        Reward storage r = rewards[_id];
        if (!r.active) revert RewardNotActive();

        uint256 target = ammPool.targetRT();
        (, uint256 current, ) = ammPool.getReserves();
        
        // Prevent division by zero
        if (current == 0) revert InsufficientReserves();

        return (r.baseCost * target) / current;
    }

    // Student redeems a reward by burning their RT
    // Note: Student must call approve() on RewardToken first
    function redeem(uint256 _id) external nonReentrant {
        // Get real-time cost
        uint256 cost = getCurrentCost(_id);
        
        // Burn RT from student's account
        rewardToken.burnFrom(msg.sender, cost);
        
        emit RewardRedeemed(msg.sender, _id, cost);
    }

    // Show all available rewards for frontend display
    function getCatalog() external view returns (Reward[] memory) {
        Reward[] memory allRewards = new Reward[](nextRewardId);
        for (uint256 i = 0; i < nextRewardId; i++) {
            allRewards[i] = rewards[i];
        }
        return allRewards;
    }
}
