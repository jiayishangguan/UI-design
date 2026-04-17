// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

interface ICommitteeManager {
    function isCommitteeMember(address user) external view returns (bool);
}

contract RewardToken is ERC20Burnable {
    // Committee manager contract
    ICommitteeManager public immutable committee;

    // Authorize ActivityVerification as the distributor of RT
    address public minter;

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    // Record Minter update
    event MinterUpdated(address indexed newMinter);

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

    // Only the authorized minter can issue verifier rewards
    modifier onlyMinter() {
        require(msg.sender == minter || msg.sender == address(committee), "Not authorized");
        _;
    }

    //  Override openzeppelin decimals to 0, contract only generates an integer number of tokens 
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    //  The Committee has set ActivityVerification to minter
    function setMinter(address _minter) external onlyCommittee {
        require(_minter != address(0), "Invalid minter");
        minter = _minter;
        emit MinterUpdated(_minter);
    }

    // Committee mints RT for pool initialization or emergency injection
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        _mint(to, amount);
        emit Minted(to, amount);
    }

    // User burns their own RT
    function burn(uint256 amount) public override {
        require(amount > 0, "Amount must be > 0");

        super.burn(amount);
        emit Burned(msg.sender, amount);
    }

    // Approved contract burns RT from another account
    function burnFrom(address account, uint256 amount) public override {
        require(account != address(0), "Invalid account");
        require(amount > 0, "Amount must be > 0");

        super.burnFrom(account, amount);
        emit Burned(account, amount);
    }
}
