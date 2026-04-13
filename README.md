CampusSwap is a decentralized application (DApp) that enables students to exchange university-issued reward tokens through an automated market maker (AMM) mechanism. Students earn tokens by participating in campus activities, which can then be swapped for other tokens or redeemed for real-world campus bonus.

Member: 
    Qi Wu , xn25549@bristol.ac.uk  
    Su Yan , fl25148@bristol.ac.uk  
    Yi Cao , bk25513@bristol.ac.uk  
    Chaoliang Luo, jj25446@bristol.ac.uk  
    Jiayi Shangguan, uf25917@bristol.ac.uk   



## Folder structure
- `Documents/` - project notes, planning files, sprint reports, and screenshots
- `Contracts/` - smart contract files
- `Frontend/` - front-end files
- `Test/` - test files
- `Scripts/` - used for deploying contracts

## Root Files
- `.env.example` - A template file illustrating the required environment variables
- `hardhat.config.js` - The central configuration file for the Hardhat environment
- `package.json` - Manages external dependencies (like OpenZeppelin), and custom terminal command scripts

## Notes
This is an early version of the repository.

More files and project content will be added in later sprints.


## Repository purpose
This repository is used as the shared workspace for CampusSwap project development. It supports not only technical implementation, but also team collaboration, sprint documentation, and evidence collection throughout the project

## Sprint timeline 

| Period | Responsible members(Product Owner&Scrum Master) |
|---|---|
| 3.16 - 3.22 | Jiayi Shangguan and Su Yan |
| 3.23 - 3.29 | Break, no sprint work |
| 3.30 - 4.5 | Qi Wu and Chaoliang Luo |
| 4.6 - 4.12 | Yi Cao and Jiayi Shangguan |
| 4.13 - 4.19 | Su Yan and Qi Wu |
| 4.20 - 4.26 | Chaoliang Luo and Yi Cao |

## Sprint report note

At the end of each week, the members responsible for the next week should prepare the Sprint Report.


## Quick Start

```bash
# Install project dependencies
npm install

# Compile smart contracts and generate artifacts
npx hardhat compile

# Execute the test suite
npx hardhat test

# hardhat coverage
npx hardhat coverage

# Deploy contracts to a local development network（mainly for CommitteeManager.sol Currently）
npx hardhat run scripts/deploy/deploy_all.js

#Create a local environment file from the template
cp .env.example .env   # (Don‘t forget to fill in your private keys and API keys in .env)

# Deploy contracts to the Sepolia Testnet
npx hardhat run scripts/deploy/deploy_all.js --network sepolia
```
