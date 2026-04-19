// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface ICommitteeManager {
    function isCommitteeMember(address user) external view returns (bool);
}

contract GreenToken is ERC20 {
    // Track cumulative GT minted to each user
    mapping(address => uint256) public totalMinted;

    // Authorized minter (normally ActivityVerification contract)
    address public minter;

    // Committee manager contract
    ICommitteeManager public immutable committee;

    event Minted(address indexed to, uint256 amount, uint256 newTotal);
    event MinterUpdated(address indexed newMinter);

    // Record the result of slash execution
    event Slashed(address indexed user, uint256 requestedAmount, uint256 actualAmount);

    constructor(string memory name, string memory symbol, address _committee)
        ERC20(name, symbol)
    {
        require(_committee != address(0), "Invalid committee");
        committee = ICommitteeManager(_committee);
    }

    modifier onlyCommittee() {
        require(msg.sender == address(committee), "Not committee");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Not authorized minter");
        _;
    }


    // Set the ActivityVerification contract as the only minter
    function setMinter(address _minter) external onlyCommittee {
        require(_minter != address(0), "Invalid minter");
        minter = _minter;
        emit MinterUpdated(_minter);
    }

    // Mint GT to a verified user
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        _mint(to, amount);
        totalMinted[to] += amount;

        emit Minted(to, amount, totalMinted[to]);
    }

    // Deduct tokens from a user as a penalty (e.g., verifier penalty or inactivity penalty).
    // Can only be called by the authorized minter (ActivityVerification).
    function slash(address user, uint256 amount) external onlyMinter returns (uint256 actualAmount) {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Amount must be > 0");

        uint256 bal = balanceOf(user);
        actualAmount = bal < amount ? bal : amount;

        if (actualAmount > 0) {
            _burn(user, actualAmount);
        }

        emit Slashed(user, amount, actualAmount);
    }






    // Return user tier based on cumulative minted GT
    // 0 = None, 1 = Bronze, 2 = Silver, 3 = Gold
    function getTier(address user) external view returns (uint8) {
        uint256 total = totalMinted[user];

        if (total >= 500) return 3;
        if (total >= 200) return 2;
        if (total >= 50) return 1;
        return 0;
    }
}
