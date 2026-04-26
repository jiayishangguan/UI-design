const { ethers } = require("hardhat");

const UNIT = ethers.parseEther("1");

const ActionType = {
  ADD_MEMBER: 0,
  REMOVE_MEMBER: 1,
  INIT_POOL: 2,
  INJECT_BUFFER: 3,
  SET_GT_MINTER: 4,
  SET_RT_MINTER: 5,
  MINT_RT: 6,
  ADD_REWARD: 7,
  REMOVE_REWARD: 8,
  GENERIC_CALL: 9,
  MINT_GT: 10,
  LOCK_START: 11,
};

function encode(types, values) {
  return ethers.AbiCoder.defaultAbiCoder().encode(types, values);
}

async function latestProposalId(committee) {
  return (await committee.proposalCount()) - 1n;
}

async function executeProposal(committee, proposer, approver, actionType, target, data) {
  await committee.connect(proposer).propose(actionType, target, data);
  const proposalId = await latestProposalId(committee);
  await committee.connect(approver).approveProposal(proposalId);
  return proposalId;
}

async function executeGenericCall(committee, proposer, approver, target, callData) {
  return executeProposal(
    committee,
    proposer,
    approver,
    ActionType.GENERIC_CALL,
    target,
    encode(["bytes"], [callData])
  );
}

async function deployBaseFixture() {
  const signers = await ethers.getSigners();
  const [member1, member2, member3, member4, member5, student, user, avOperator, ...rest] =
    signers;

  const CommitteeManager = await ethers.getContractFactory("CommitteeManager");
  const committee = await CommitteeManager.deploy([
    member1.address,
    member2.address,
    member3.address,
  ]);

  const GreenToken = await ethers.getContractFactory("GreenToken");
  const greenToken = await GreenToken.deploy("Green Token", "GT", committee.target);

  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy("Reward Token", "RT", committee.target);

  const VerifierManager = await ethers.getContractFactory("VerifierManager");
  const verifierManager = await VerifierManager.deploy(greenToken.target, committee.target);

  const ActivityVerification = await ethers.getContractFactory("ActivityVerification");
  const activityVerification = await ActivityVerification.deploy(
    greenToken.target,
    rewardToken.target,
    committee.target,
    verifierManager.target
  );

  const AMMPool = await ethers.getContractFactory("AMMPool");
  const ammPool = await AMMPool.deploy(greenToken.target, rewardToken.target, committee.target);

  const RewardRedemption = await ethers.getContractFactory("RewardRedemption");
  const rewardRedemption = await RewardRedemption.deploy(
    rewardToken.target,
    ammPool.target,
    committee.target
  );

  return {
    signers,
    members: [member1, member2, member3, member4, member5],
    accounts: { student, user, avOperator, rest },
    committee,
    greenToken,
    rewardToken,
    verifierManager,
    activityVerification,
    ammPool,
    rewardRedemption,
  };
}

async function configureActivityVerification(fixture) {
  const { members, committee, greenToken, rewardToken, verifierManager, activityVerification } =
    fixture;
  const [member1, member2] = members;

  await executeProposal(
    committee,
    member1,
    member2,
    ActionType.SET_GT_MINTER,
    greenToken.target,
    encode(["address"], [activityVerification.target])
  );
  await executeProposal(
    committee,
    member1,
    member2,
    ActionType.SET_RT_MINTER,
    rewardToken.target,
    encode(["address"], [activityVerification.target])
  );

  const setAvData = verifierManager.interface.encodeFunctionData("setActivityVerification", [
    activityVerification.target,
  ]);
  await executeGenericCall(committee, member1, member2, verifierManager.target, setAvData);
}

async function setGreenTokenMinter(fixture, minter) {
  const { members, committee, greenToken } = fixture;
  await executeProposal(
    committee,
    members[0],
    members[1],
    ActionType.SET_GT_MINTER,
    greenToken.target,
    encode(["address"], [minter])
  );
}

async function setRewardTokenMinter(fixture, minter) {
  const { members, committee, rewardToken } = fixture;
  await executeProposal(
    committee,
    members[0],
    members[1],
    ActionType.SET_RT_MINTER,
    rewardToken.target,
    encode(["address"], [minter])
  );
}

async function mintGT(fixture, to, amount) {
  const { members, committee, greenToken } = fixture;
  await executeProposal(
    committee,
    members[0],
    members[1],
    ActionType.MINT_GT,
    greenToken.target,
    encode(["address", "uint256"], [to, amount])
  );
}

async function mintRT(fixture, to, amount) {
  const { members, committee, rewardToken } = fixture;
  await executeProposal(
    committee,
    members[0],
    members[1],
    ActionType.MINT_RT,
    rewardToken.target,
    encode(["address", "uint256"], [to, amount])
  );
}

async function approveFromGovernance(fixture, token, spender, amount) {
  const { members, committee } = fixture;
  const callData = token.interface.encodeFunctionData("approve", [spender, amount]);
  await executeGenericCall(committee, members[0], members[1], token.target, callData);
}

async function initializePool(fixture, gtAmount, rtAmount) {
  const { members, committee, ammPool } = fixture;
  await approveFromGovernance(fixture, fixture.greenToken, ammPool.target, gtAmount);
  await approveFromGovernance(fixture, fixture.rewardToken, ammPool.target, rtAmount);
  await executeProposal(
    committee,
    members[0],
    members[1],
    ActionType.INIT_POOL,
    ammPool.target,
    encode(["uint256", "uint256"], [gtAmount, rtAmount])
  );
}

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine");
}

module.exports = {
  UNIT,
  ActionType,
  encode,
  executeProposal,
  executeGenericCall,
  deployBaseFixture,
  configureActivityVerification,
  setGreenTokenMinter,
  setRewardTokenMinter,
  mintGT,
  mintRT,
  approveFromGovernance,
  initializePool,
  increaseTime,
};
