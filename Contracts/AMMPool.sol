// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// author Su Yan

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// governance address — only the CommitteeManager contract can call sensitive functions
// individual committee members cannot call directly; they must go through multi-sig proposals


contract AMMPool is ReentrancyGuard {
    // custom errors
    // GT address is zero
    error InvalidGTAddress();

    // RT address is zero
    error InvalidRTAddress();

    // treasury address is zero
    error InvalidTreasuryAddress();

    // GT and RT cannot be the same token
    error SameTokenAddress();

    // pool was already initialized before
    error PoolAlreadyInitialized();

    // pool is not initialized yet
    error PoolNotInitialized();

    // GT amount cannot be 0
    error ZeroGTAmount();

    // RT amount cannot be 0
    error ZeroRTAmount();

    // GT transfer did not work
    error GTTransferFailed();

    // RT transfer did not work
    error RTTransferFailed();

    // input amount cannot be 0
    error ZeroAmountIn();

    // pool reserve is empty
    error EmptyReserve();

    // output amount is 0
    error ZeroAmountOut();

    // minimum output is not met
    error SlippageTooHigh();

    // GT input transfer failed
    error SwapGTTransferFailed();

    // RT output transfer failed
    error SwapRTTransferFailed();

    // RT input transfer failed
    error SwapRTInTransferFailed();

    // GT output transfer failed
    error SwapGTOutTransferFailed();

    // committee address is zero
    error InvalidCommitteeAddress();

    // caller is not a committee member
    error NotCommitteeMember();


    // can't allow to save 0 in buffer
    error ZeroBufferAmount();

    // RT transfer to buffer failed
    error BufferRTTransferFailed();

    // buffer can't the max size
    error BufferSizeIsMax();

    // requested GT is bigger than the current immediate limit
    error EffectiveGTExceeded(uint256 requestedGT, uint256 allowedGT);


    // 10000 bp = 100%
    uint256 public constant BASIS_POINTS = 10000;

    // Version C update
    uint256 public constant MAX_SWAP_PER_USER = 50 ; // one user can only swap 50 gt one day
    uint256 public constant MAX_SWAP_PROPORTION = 4000; // 40% of user holdings in basis points
    uint256 public constant TARGET_RT = 3000 ; // target RT reserve
    uint256 public constant INJECT_TRIGGER = 4000; // trigger inject when reserveRT is below 40% of target
    uint256 public constant BUFFER_SIZE = 3600 ; // buffer can hold at most 3600 RT
    uint256 public constant BUFFER_ALERT = 900 ; // alert
    uint256 public constant COOLDOWN_INJECT = 1 days; // wait 24 hours between inject actions
    
    // fixed treasury address — initial liquidity and buffer RT always come from here
    address public immutable treasury;
   
    // Version C buffer state
    uint256 public bufferRT; // RT stored in buffer, not in swap reserve
    uint256 public lastInjectTime; // timestamp of the last inject action


    // save one user's daily GT swap usage
    struct DailyGTSwap { 
        uint256 day; // current day
        uint256 usedGT; // how much GT the user has used today
    }

    // save daily GT usage for each user
    mapping(address => DailyGTSwap) public dailyGTSwap;


    // define GT and RT
    IERC20 public greenToken;
    IERC20 public rewardToken;

    // governance — only CommitteeManager contract address can call sensitive functions
    address public immutable governance;

    uint256 public reserveGT; // to see how much GT in this pool
    uint256 public reserveRT; // to see how much RT in this pool
    uint256 public k; // to define k(k = GT * RT)

    bool public initialized; // to check this pool if has been initialized





    // Event
    // send a event to show initial situation
    event PoolInitialized(uint256 gtAmount, uint256 rtAmount, uint256 newK);

    // log swap result
    event Swap(address indexed user, bool isGTtoRT, uint256 amountIn, uint256 amountOut, uint256 feeRate);


    
    // record buffer
    event BufferSituation(address indexed operator, uint256 amount, uint256 newBufferRT);
    
    // record auto inject result
    event RTInjected(address indexed operator, uint256 amount, uint256 newReserveRT, uint256 newBufferRT, uint256 newK);

    // record low buffer alert
    event BufferAlert(uint256 currentBufferRT);


    
    
    
    
    // only the CommitteeManager contract (governance) can call sensitive functions
    // individual committee members cannot bypass multi-sig by calling directly
    modifier onlyCommittee() {
        if (msg.sender != governance) revert NotCommitteeMember();
        _;
    }

    // save token address, governance address and fixed treasury address
    constructor(address gt, address rt, address _governance, address _treasury) {
        // check GT address
        if (gt == address(0)) revert InvalidGTAddress();

        // check RT address
        if (rt == address(0)) revert InvalidRTAddress();

        // check GovernanceAddress
        if (_governance == address(0)) revert InvalidCommitteeAddress();

        // GT and RT must be different
        if (gt == rt) revert SameTokenAddress();

        // check treasury address
        if (_treasury == address(0)) revert InvalidTreasuryAddress();

        // set fixed treasury address
        treasury = _treasury;


        // input GT address
        greenToken = IERC20(gt);

        // input RT address
        rewardToken = IERC20(rt);

        // set governance (CommitteeManager contract address)
        governance = _governance;

        }

        
    // first time to add GT and RT into the pool
    function initialize(uint256 gtAmount, uint256 rtAmount) external onlyCommittee {
        // only allow once in the beginning
        if (initialized) revert PoolAlreadyInitialized();

        // the initial amount must more than 0
        if (gtAmount == 0) revert ZeroGTAmount();
        if (rtAmount == 0) revert ZeroRTAmount();

        // move GT from treasury to this pool(must approved)
        if (!greenToken.transferFrom(treasury, address(this), gtAmount)) {revert GTTransferFailed();}

        // move RT from treasury to this pool(must approved)
        if (!rewardToken.transferFrom(treasury, address(this), rtAmount)) {revert RTTransferFailed();}

        // save reserve
        reserveGT = gtAmount;
        reserveRT = rtAmount;

        // set initial k
        k = reserveGT * reserveRT;

        // set pool already initialized
        initialized = true;

        // log this situation
        emit PoolInitialized(gtAmount, rtAmount, k);

    }



    // check current pool reserves(GT and RT amounts) and k
    function getReserves() external view returns (uint256 gt, uint256 rt, uint256 currentK) {
        return (reserveGT, reserveRT, k);
    }

    // check current fee rate(10=10bp=0.1%) by RT reserve ratio 
    function getCurrentFeeRate() public view returns (uint256 bp) {
        // pool must be ready first
        if (!initialized) revert PoolNotInitialized();

        // more than 80% -> 10bp
        if (reserveRT * 100 > TARGET_RT * 80) {
            return 10;
        }

        // 60% to 80% -> 30bp
        if (reserveRT * 100 >= TARGET_RT * 60) {
            return 30;
        }

        // 40% to 60% -> 70bp
        if (reserveRT * 100 >= TARGET_RT * 40) {
            return 70;
        }

        // below 40% -> 150bp
        return 150;
    }



    // check output amount before swap
    function getAmountOut(uint256 amountIn, bool isGTtoRT) public view returns (uint256 amountOut){
        // pool must be ready first
        if (!initialized) revert PoolNotInitialized();

        // input amount must be greater than 0
        if (amountIn == 0) revert ZeroAmountIn();

        uint256 reserveIn;
        uint256 reserveOut;

        // choose input and output reserves by swap direction
        if (isGTtoRT) {
            reserveIn = reserveGT;
            reserveOut = reserveRT;
        } else {
            reserveIn = reserveRT;
            reserveOut = reserveGT;
        }

        // both sides must have reserve
        if (reserveIn == 0 || reserveOut == 0) revert EmptyReserve();

        // get current fee rate
        uint256 feeRate = getCurrentFeeRate();

        // apply fee on input amount first
        uint256 amountInWithFee = amountIn * (BASIS_POINTS - feeRate);

        // use the AMM formula to calculate output
        // input is charged with fee first
        // keep division at the end for better precision
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * BASIS_POINTS + amountInWithFee);

        // do not allow zero output
        if (amountOut == 0) revert ZeroAmountOut();
    }




    // try to automatelly inject RT from buffer into reserve when needed
    function _autoInjectIfNeeded() internal {
        // calculate the RT trigger
        uint256 injectTriggerRT = (TARGET_RT * INJECT_TRIGGER) / BASIS_POINTS;

        // stop when reserve isn't low
        if (reserveRT >= injectTriggerRT) { return; }

        // stop when cooldown isn't end
        if (lastInjectTime != 0) { 
            // calculate the next inject time
            uint256 nextInjectTime = lastInjectTime + COOLDOWN_INJECT;
            // stop
            if (block.timestamp < nextInjectTime) { return; }
        }

        // send alert when buffer is empty
        if (bufferRT == 0) { emit BufferAlert(bufferRT); return; }

        // calculate how much RT to full the RT pool
        uint256 neededRT = TARGET_RT - reserveRT;
        
        uint256 injectAmount;
        // choose the smaller value between needed RT and buffer RT
        if (bufferRT < neededRT) {
            // buffer is smaller, so use all bufferRT
            injectAmount = bufferRT;
        } else { 
            // neededRT is smaller, so only use neededRT
            injectAmount = neededRT;
        }
    
        // move RT out from buffer
        bufferRT -= injectAmount;

        // add RT into reserve rt pool
        reserveRT += injectAmount;

        // save this time
        lastInjectTime = block.timestamp;

        // update k
        k = reserveGT * reserveRT;

        // record the inject result
        emit RTInjected(msg.sender, injectAmount, reserveRT, bufferRT, k);

        // send alert when buffer is low
        if (bufferRT < BUFFER_ALERT) { emit BufferAlert(bufferRT); }

    }



    // get current day
    function _getCurrentDay() internal view returns (uint256 day) {
        // use blockchain time and divide by one day
        return block.timestamp / 1 days;
    }


    // check how much GT one user used today
    function getUsedGTToday(address user) public view returns (uint256) {
        // get current day
        uint256 currentDay = _getCurrentDay();

        // return 0 when the saved record is from an old day
        if (dailyGTSwap[user].day != currentDay) { return 0; }

        // return today's used GT amount
        return dailyGTSwap[user].usedGT;
    }


    // check how much GT one user can still use today
    function getRemainingDailyGT(address user) public view returns (uint256) { 
        // get today's used GT amount
        uint256 usedToday = getUsedGTToday(user);

        // return 0 when the user already used all 
        if (usedToday >= MAX_SWAP_PER_USER) { return 0; }

        // return the remaining
        return MAX_SWAP_PER_USER - usedToday;
    }



    // add GT usage into today's record
    function _addDailyUsedGT(address user, uint256 amount) internal {
        // get current day
        uint256 currentDay = _getCurrentDay();

        // reset the record when a new day
         if (dailyGTSwap[user].day != currentDay) {
            dailyGTSwap[user].day = currentDay; dailyGTSwap[user].usedGT = 0;
         }

        // add today's used GT amount
        dailyGTSwap[user].usedGT += amount;

    }


    // check the 40% GT holding limit for one user
    function getHoldingLimitGT(address user) public view returns (uint256) {
        // get user's current GT
        uint256 userGT = greenToken.balanceOf(user);

        // return 40% of the user's GT
        return (userGT * MAX_SWAP_PROPORTION) / BASIS_POINTS;
    }



    // check the current immediate GT limit for one user (directly use it in front page)
     function getCurrentImmediateLimit(address user) public view returns (uint256) { 
        // get the user's remaining daily GT
        uint256 remainingDailyGT = getRemainingDailyGT(user);

        // get the user's 40% holding limit
        uint256 holdingLimitGT = getHoldingLimitGT(user);

        // return the smaller 
        if (remainingDailyGT < holdingLimitGT) { return remainingDailyGT; }

        else return holdingLimitGT;
     }



    // calculate how much GT can be swapped
    function _getEffectiveGT(address user, uint256 gtIn) internal view returns (uint256) {
        // get the user's current immediate limit
        uint256 immediateLimit = getCurrentImmediateLimit(user);


        // start with the input amount
        uint256 effectiveGT = gtIn;

        // use the smaller value 
        if (immediateLimit < effectiveGT)  { effectiveGT = immediateLimit; }

        
        // return the final
        return effectiveGT;
    }




    // swap GT for RT
    function swapGTforRT(uint256 gtIn, uint256 minRTOut) external nonReentrant returns (uint256 rtOut) {
        // pool must be ready first
        if (!initialized) revert PoolNotInitialized();

        // input must be greater than 0
        if (gtIn == 0) revert ZeroAmountIn();

        // automatically add RT reserve from buffer when needed
        _autoInjectIfNeeded();

        // calculate the current immediate GT limit for this user
        uint256 effectiveGT = _getEffectiveGT(msg.sender, gtIn);

        // stop when requested GT is above the immediate limit
        if (gtIn > effectiveGT) { revert EffectiveGTExceeded(gtIn, effectiveGT); }
        
        // get output before swap
        rtOut = getAmountOut(gtIn, true);
        
        // make sure output is not below user limit
        if (rtOut < minRTOut) revert SlippageTooHigh();

        // save fee rate for event log
        uint256 feeRate = getCurrentFeeRate();

        // move GT from user to pool
        if (!greenToken.transferFrom(msg.sender, address(this), gtIn)) { revert SwapGTTransferFailed();}

        // move RT from pool to user
        if (!rewardToken.transfer(msg.sender, rtOut)) { revert SwapRTTransferFailed();}

        // update pool reserves
        reserveGT += gtIn;
        reserveRT -= rtOut;

        // update k after swap
        k = reserveGT * reserveRT;

        // record today's used GT
        _addDailyUsedGT(msg.sender, gtIn);

        // automatically add RT reserve from buffer when needed
        _autoInjectIfNeeded();

        // show the current situation 
        emit Swap(msg.sender, true, gtIn, rtOut, feeRate);
    }



    // swap RT for GT
    function swapRTforGT(uint256 rtIn, uint256 minGTOut) external nonReentrant returns (uint256 gtOut){
        // pool must be ready first
        if (!initialized) revert PoolNotInitialized();

        // input must be greater than 0
        if (rtIn == 0) revert ZeroAmountIn();

        // get output before swap
        gtOut = getAmountOut(rtIn, false);

        // make sure output is not below user limit
        if (gtOut < minGTOut) revert SlippageTooHigh();

        // save fee rate for event log
        uint256 feeRate = getCurrentFeeRate();

        // move RT from user to pool
        if (!rewardToken.transferFrom(msg.sender, address(this), rtIn)) { revert SwapRTInTransferFailed();}

        // move GT from pool to user
        if (!greenToken.transfer(msg.sender, gtOut)) { revert SwapGTOutTransferFailed(); }

        // update pool reserves
        reserveRT += rtIn;
        reserveGT -= gtOut;

        // update k after swap
        k = reserveGT * reserveRT;

        // show the current situation
        emit Swap(msg.sender, false, rtIn, gtOut, feeRate);
    }




    // committeeManager can inject RT into the buffer
    function BufferRTAction(uint256 amount) external onlyCommittee {
       // pool must be ready first 
       if (!initialized) revert PoolNotInitialized();

       // can't allow to save 0 in buffer
       if (amount == 0) revert ZeroBufferAmount();

       // buffer can't the max size
       if (bufferRT + amount > BUFFER_SIZE) revert BufferSizeIsMax();

       // RT transfer to buffer failed 
       if (!rewardToken.transferFrom(treasury, address(this), amount)) { revert BufferRTTransferFailed(); }

       // update buffer RT amount
       bufferRT += amount;

       // show the current situation
       emit BufferSituation(msg.sender, amount, bufferRT);
    }

    // see status to test and set front page
    function getPoolStatus() external view returns (uint256 currentReserveGT, uint256 currentReserveRT, uint256 currentBufferRT, uint256 currentK, uint256 currentLastInjectTime){
        return (reserveGT, reserveRT, bufferRT, k, lastInjectTime);
    }




}