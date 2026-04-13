(function () {
  const { ethers } = window;
  const CONFIG = window.CAMPUS_SWAP_CONFIG;

  const routes = [
    { id: "landing", label: "Landing" },
    { id: "dashboard", label: "Dashboard" },
    { id: "earn", label: "Earn GT" },
    { id: "swap", label: "Swap" },
    { id: "rewards", label: "Rewards" },
    { id: "activity", label: "Activity" },
    { id: "profile", label: "Profile" },
  ];

  const navRoutes = routes.filter((route) => route.id !== "landing");

  const state = {
    route: getRoute(),
    provider: null,
    signer: null,
    account: "",
    chainId: "",
    contracts: {},
    abis: {},
    balances: {
      gt: "0",
      rt: "0",
    },
    user: {
      tier: "None",
      tierLevel: 0,
      gtMinted: "0",
      username: "Guest User",
      email: "student@campusswap.local",
    },
    swap: {
      feeRate: null,
      gtLimit: null,
      reserves: null,
    },
    rewards: [],
    activities: [],
    notifications: [],
    issues: [],
    contractsReady: false,
  };

  const app = document.getElementById("app");
  const nav = document.getElementById("nav");
  const quickConnectBtn = document.getElementById("quick-connect-btn");

  quickConnectBtn.addEventListener("click", async () => {
    if (state.account) {
      setRoute("profile");
      return;
    }
    await connectWallet();
  });

  window.addEventListener("hashchange", () => {
    state.route = getRoute();
    render();
  });

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      state.account = accounts[0] || "";
      if (state.account) {
        await setupWalletState();
      } else {
        resetWalletState();
      }
      render();
    });

    window.ethereum.on("chainChanged", async () => {
      await initialize();
    });
  }

  initialize();

  async function initialize() {
    renderShell();
    await loadAbis();
    await restoreWallet();
    render();
  }

  async function loadAbis() {
    const entries = Object.entries(CONFIG.artifacts);
    for (const [key, path] of entries) {
      try {
        const response = await fetch(path);
        const json = await response.json();
        state.abis[key] = json.abi;
      } catch (error) {
        pushIssue(`Unable to load ABI: ${key}`);
      }
    }
  }

  async function restoreWallet() {
    if (!window.ethereum) {
      pushIssue("MetaMask was not detected. Install a browser wallet to enable on-chain actions.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);
      if (!accounts.length) return;

      state.provider = provider;
      state.signer = await provider.getSigner();
      state.account = accounts[0];
      await setupWalletState();
    } catch (error) {
      pushIssue("Wallet restore failed.");
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      pushIssue("MetaMask was not detected. Install MetaMask before connecting.");
      render();
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      state.provider = provider;
      state.signer = await provider.getSigner();
      state.account = await state.signer.getAddress();
      await setupWalletState();
      if (state.route === "landing") setRoute("dashboard");
    } catch (error) {
      pushIssue(parseError(error, "Wallet connection was rejected."));
    }
    render();
  }

  async function setupWalletState() {
    if (!state.provider || !state.account) return;
    const network = await state.provider.getNetwork();
    state.chainId = String(network.chainId);
    instantiateContracts();
    await refreshAllData();
  }

  function instantiateContracts() {
    state.contracts = {};
    state.contractsReady = false;

    if (!state.signer) return;

    const entries = Object.entries(CONFIG.contracts);
    let configured = 0;

    for (const [key, address] of entries) {
      if (!address || !ethers.isAddress(address) || !state.abis[key]) continue;
      state.contracts[key] = new ethers.Contract(address, state.abis[key], state.signer);
      configured += 1;
    }

    state.contractsReady = configured > 0;
  }

  function resetWalletState() {
    state.provider = null;
    state.signer = null;
    state.account = "";
    state.chainId = "";
    state.contracts = {};
    state.contractsReady = false;
    state.balances = { gt: "0", rt: "0" };
    state.rewards = [];
    state.activities = [];
  }

  async function refreshAllData() {
    if (!state.account || !state.contractsReady) return;
    await Promise.all([
      loadBalances(),
      loadProfile(),
      loadSwapData(),
      loadRewards(),
      loadActivities(),
    ]);
  }

  async function loadBalances() {
    const gt = state.contracts.greenToken;
    const rt = state.contracts.rewardToken;
    if (!gt || !rt) return;

    try {
      const [gtBalance, rtBalance] = await Promise.all([
        gt.balanceOf(state.account),
        rt.balanceOf(state.account),
      ]);
      state.balances.gt = gtBalance.toString();
      state.balances.rt = rtBalance.toString();
    } catch (error) {
      pushIssue("Unable to read GT/RT balances from contracts.");
    }
  }

  async function loadProfile() {
    const gt = state.contracts.greenToken;
    if (!gt) return;
    try {
      const [tierLevel, totalMinted] = await Promise.all([
        gt.getTier(state.account),
        gt.totalMinted(state.account),
      ]);
      state.user.tierLevel = Number(tierLevel);
      state.user.tier = ["None", "Bronze", "Silver", "Gold"][Number(tierLevel)] || "None";
      state.user.gtMinted = totalMinted.toString();
      state.user.username = `Student ${shortAddress(state.account).slice(0, 9)}`;
    } catch (error) {
      pushIssue("Unable to load user tier data.");
    }
  }

  async function loadSwapData() {
    const amm = state.contracts.ammPool;
    if (!amm) return;
    try {
      const [feeRate, gtLimit, reserves] = await Promise.all([
        amm.getCurrentFeeRate(),
        amm.getCurrentImmediateLimit(state.account),
        amm.getReserves(),
      ]);
      state.swap.feeRate = feeRate.toString();
      state.swap.gtLimit = gtLimit.toString();
      state.swap.reserves = {
        gt: reserves[0].toString(),
        rt: reserves[1].toString(),
      };
    } catch (error) {
      pushIssue("AMM data is not available yet. This usually means the pool is not deployed or initialized.");
    }
  }

  async function loadRewards() {
    const redemption = state.contracts.rewardRedemption;
    if (!redemption) return;
    try {
      const rewards = await redemption.getCatalog();
      state.rewards = rewards.map((item, index) => ({
        id: index,
        name: item.name,
        baseCost: item.baseCost.toString(),
        active: item.active,
      }));
    } catch (error) {
      pushIssue("Reward catalog is not available yet.");
    }
  }

  async function loadActivities() {
    const activity = state.contracts.activityVerification;
    const redemption = state.contracts.rewardRedemption;
    if (!activity) return;

    const items = [];
    try {
      const total = Number((await activity.taskCount()).toString());
      for (let i = Math.max(0, total - 10); i < total; i += 1) {
        const task = await activity.tasks(i);
        if (task.submitter.toLowerCase() !== state.account.toLowerCase()) continue;
        items.unshift({
          kind: "task",
          id: i,
          title: task.actionType,
          subtitle: `Proof: ${task.proofCID || "N/A"}`,
          status: taskStatusLabel(Number(task.status)),
          meta: `${task.gtReward.toString()} GT`,
        });
      }
    } catch (error) {
      pushIssue("Recent activity history could not be fully loaded.");
    }

    if (redemption) {
      try {
        const filter = redemption.filters.RewardRedeemed(state.account);
        const logs = await redemption.queryFilter(filter, -10000);
        logs.slice(-5).reverse().forEach((log) => {
          items.push({
            kind: "redeem",
            id: Number(log.args.rewardId),
            title: `Reward redeemed #${Number(log.args.rewardId)}`,
            subtitle: "RewardRedemption event",
            status: "Completed",
            meta: `${log.args.cost.toString()} RT`,
          });
        });
      } catch (error) {
        // Best effort only.
      }
    }

    state.activities = items.slice(0, 12);
  }

  async function submitTask(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const actionType = String(form.get("actionType") || "").trim();
    const proofCID = String(form.get("proofCID") || "").trim();
    const gtReward = Number(form.get("gtReward") || CONFIG.defaults.earnRewardAmount);

    const contract = state.contracts.activityVerification;
    if (!contract) {
      pushIssue("ActivityVerification contract is not configured.");
      render();
      return;
    }

    try {
      const tx = await contract.submitTask(actionType, proofCID, gtReward);
      await tx.wait();
      pushNotification("Activity submitted successfully.");
      event.currentTarget.reset();
      await refreshAllData();
    } catch (error) {
      pushIssue(parseError(error, "Activity submission failed."));
    }
    render();
  }

  async function executeSwap(direction, formElement) {
    const form = new FormData(formElement);
    const amount = String(form.get("amount") || "0").trim();
    const amm = state.contracts.ammPool;
    if (!amm) {
      pushIssue("AMM contract is not configured.");
      render();
      return;
    }

    const amountBigInt = safeBigInt(amount);
    if (amountBigInt === null || amountBigInt <= 0n) {
      pushIssue("Enter a valid integer amount.");
      render();
      return;
    }

    try {
      const preview = await amm.getAmountOut(amountBigInt, direction === "gtToRt");
      const minOut = applySlippage(preview, CONFIG.defaults.swapSlippageBps);

      if (direction === "gtToRt") {
        await ensureApproval(state.contracts.greenToken, CONFIG.contracts.ammPool, amountBigInt);
        const tx = await amm.swapGTforRT(amountBigInt, minOut);
        await tx.wait();
      } else {
        await ensureApproval(state.contracts.rewardToken, CONFIG.contracts.ammPool, amountBigInt);
        const tx = await amm.swapRTforGT(amountBigInt, minOut);
        await tx.wait();
      }

      pushNotification("Swap completed.");
      formElement.reset();
      await refreshAllData();
    } catch (error) {
      pushIssue(parseError(error, "Swap failed."));
    }
    render();
  }

  async function redeemReward(id) {
    const redemption = state.contracts.rewardRedemption;
    if (!redemption || !state.contracts.rewardToken) {
      pushIssue("Reward redemption contracts are not configured.");
      render();
      return;
    }

    try {
      const cost = await redemption.getCurrentCost(id);
      await ensureApproval(state.contracts.rewardToken, CONFIG.contracts.rewardRedemption, cost);
      const tx = await redemption.redeem(id);
      await tx.wait();
      pushNotification(`Reward #${id} redeemed.`);
      await refreshAllData();
    } catch (error) {
      pushIssue(parseError(error, "Reward redemption failed."));
    }
    render();
  }

  async function claimQueued(taskId) {
    const contract = state.contracts.activityVerification;
    if (!contract) return;

    try {
      const tx = await contract.claimQueuedGT(taskId);
      await tx.wait();
      pushNotification(`Queued GT claimed for task #${taskId}.`);
      await refreshAllData();
    } catch (error) {
      pushIssue(parseError(error, "Queued GT claim failed."));
    }
    render();
  }

  async function ensureApproval(tokenContract, spender, amount) {
    if (!tokenContract || !spender) return;
    const allowance = await tokenContract.allowance(state.account, spender);
    if (allowance >= amount) return;
    const tx = await tokenContract.approve(spender, amount);
    await tx.wait();
  }

  function render() {
    renderShell();
    const needsWallet = state.route !== "landing";
    if (needsWallet && !state.account) {
      setRoute("landing");
      return;
    }
    app.innerHTML = renderPage();
    bindPageEvents();
  }

  function renderShell() {
    nav.innerHTML = navRoutes
      .map(
        (route) => `
          <a class="nav-link ${state.route === route.id ? "active" : ""}" href="#/${route.id}">
            ${route.label}
          </a>`
      )
      .join("");

    quickConnectBtn.textContent = state.account ? shortAddress(state.account) : "Connect";
  }

  function bindPageEvents() {
    document.getElementById("connect-btn")?.addEventListener("click", connectWallet);
    document.getElementById("submit-task-form")?.addEventListener("submit", submitTask);
    document.getElementById("swap-gt-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      executeSwap("gtToRt", event.currentTarget);
    });
    document.getElementById("swap-rt-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      executeSwap("rtToGt", event.currentTarget);
    });

    document.querySelectorAll("[data-redeem-id]").forEach((button) => {
      button.addEventListener("click", () => redeemReward(Number(button.dataset.redeemId)));
    });

    document.querySelectorAll("[data-claim-task]").forEach((button) => {
      button.addEventListener("click", () => claimQueued(Number(button.dataset.claimTask)));
    });
  }

  function renderPage() {
    switch (state.route) {
      case "dashboard":
        return dashboardPage();
      case "earn":
        return earnPage();
      case "swap":
        return swapPage();
      case "rewards":
        return rewardsPage();
      case "activity":
        return activityPage();
      case "profile":
        return profilePage();
      case "landing":
      default:
        return landingPage();
    }
  }

  function landingPage() {
    return `
      <section class="page">
        ${renderFeedback()}
        <div class="page-grid">
          <section class="hero-card">
            <div class="section-kicker">Campus Swap / Green Theme</div>
            <h1 class="hero-title">Connect Your Wallet</h1>
            <p class="hero-copy">
              Join a clean Web3 workflow for green activities, GT rewards, AMM swaps, and campus redemptions.
            </p>
            <div class="wallet-icon-wrap">
              <div class="wallet-icon">🦊</div>
            </div>
            <div class="inline-actions">
              <button id="connect-btn" class="primary-button">Connect MetaMask Wallet</button>
              <a class="secondary-button" href="#/dashboard">Preview Structure</a>
            </div>
            <div class="footer-note">
              Wallet connection unlocks Dashboard, Earn GT, Swap, Rewards, Activity, and Profile.
            </div>
          </section>

          <div class="stack">
            ${userInfoCard()}
            <section class="glass-card">
              <div class="card-title-row">
                <div>
                  <h2 class="card-title">Platform Flow</h2>
                  <p class="muted">Core user journey aligned with your existing contracts.</p>
                </div>
                <div class="badge"><span class="status-dot"></span> Ready for extension</div>
              </div>
              <div class="list">
                ${["Connect Wallet", "Submit Green Action", "Verifier Review", "Receive GT", "Swap to RT", "Redeem Rewards"]
                  .map(
                    (step, index) => `
                      <div class="list-item">
                        <div class="small">Step ${index + 1}</div>
                        <strong>${step}</strong>
                      </div>`
                  )
                  .join("")}
              </div>
            </section>
          </div>
        </div>
      </section>
    `;
  }

  function dashboardPage() {
    return `
      <section class="page">
        ${renderFeedback()}
        <div class="page-grid">
          <section class="hero-card">
            <div class="section-kicker">Dashboard</div>
            <h1 class="hero-title">Green actions become campus value.</h1>
            <p class="hero-copy">
              Welcome to the CampusSwap dashboard. Track token balances, review your status, and jump into the main flows.
            </p>
            <div class="token-grid">
              ${tokenBalanceCard("GreenToken", state.balances.gt, "GT balance from contract")}
              ${tokenBalanceCard("RewardToken", state.balances.rt, "RT balance from contract")}
            </div>
          </section>
          <div class="stack">
            ${userInfoCard()}
            <section class="glass-card">
              <div class="card-title-row">
                <div>
                  <h2 class="card-title">Account Overview</h2>
                  <p class="muted">Quick read on wallet, tier, and network state.</p>
                </div>
                <div class="badge"><span class="status-dot"></span> ${state.chainId ? `Chain ${state.chainId}` : "Disconnected"}</div>
              </div>
              <div class="stat-grid">
                ${statCard("Tier", state.user.tier)}
                ${statCard("Minted GT", state.user.gtMinted)}
                ${statCard("AMM Fee", state.swap.feeRate ? `${state.swap.feeRate} bp` : "N/A")}
                ${statCard("GT Limit", state.swap.gtLimit || "N/A")}
              </div>
            </section>
          </div>
        </div>

        <section class="page">
          <div class="feature-grid">
            ${featureCard("Earn GT", "Submit a new green action and follow verification status.", "#/earn")}
            ${featureCard("Swap", "Use the existing AMM methods to swap GT and RT.", "#/swap")}
            ${featureCard("Rewards", "Browse available rewards and redeem RT.", "#/rewards")}
            ${featureCard("Activity", "Review recent submissions and redemption history.", "#/activity")}
          </div>
        </section>
      </section>
    `;
  }

  function earnPage() {
    return `
      <section class="page">
        ${renderFeedback()}
        <div class="page-grid">
          <section class="glass-card">
            <div class="card-title-row">
              <div>
                <div class="section-kicker">Earn GT</div>
                <h2 class="panel-title">Submit a green activity</h2>
                <p class="muted">This form maps to the existing <span class="mono">submitTask(actionType, proofCID, gtReward)</span> contract call.</p>
              </div>
              <div class="badge">Reward fixed at ${CONFIG.defaults.earnRewardAmount} GT</div>
            </div>

            <form id="submit-task-form" class="form-grid">
              <div class="form-row two">
                <label>
                  <span>Activity Type</span>
                  <input name="actionType" placeholder="Recycling / Bike Commute / Tree Planting" required />
                </label>
                <label>
                  <span>GT Reward</span>
                  <input name="gtReward" type="number" min="5" step="1" value="${CONFIG.defaults.earnRewardAmount}" required />
                </label>
              </div>
              <label>
                <span>Proof CID / Evidence Link</span>
                <input name="proofCID" placeholder="IPFS CID or evidence identifier" required />
              </label>
              <div class="banner">
                Submission flow: submit activity -> assigned verifier review -> approved / rejected -> GT mint or queue claim.
              </div>
              <div class="inline-actions">
                <button class="primary-button" type="submit">Submit Activity</button>
                <a class="secondary-button" href="#/activity">View My Activity</a>
              </div>
            </form>
          </section>

          <section class="glass-card">
            <div class="card-title-row">
              <div>
                <h2 class="card-title">Status Flow</h2>
                <p class="muted">Front-end summary of your task lifecycle.</p>
              </div>
            </div>
            <div class="list">
              ${["Submitted", "Waiting Verification", "Approved", "Rejected"]
                .map(
                  (label) => `
                    <div class="list-item">
                      <strong>${label}</strong>
                      <div class="small">Mapped from current task status and verification process.</div>
                    </div>`
                )
                .join("")}
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function swapPage() {
    return `
      <section class="page">
        ${renderFeedback()}
        <div class="page-grid">
          <section class="glass-card">
            <div class="card-title-row">
              <div>
                <div class="section-kicker">Swap</div>
                <h2 class="panel-title">GT / RT exchange</h2>
                <p class="muted">Uses the existing AMM methods without renaming or changing contract interfaces.</p>
              </div>
              <div class="badge">${state.swap.feeRate ? `${state.swap.feeRate} bp fee` : "Fee unavailable"}</div>
            </div>

            <form id="swap-gt-form" class="form-grid">
              <label>
                <span>Swap GT to RT</span>
                <input name="amount" type="number" min="1" step="1" placeholder="Amount of GT" required />
              </label>
              <div class="helper-text">Available GT: ${state.balances.gt} | Current immediate GT limit: ${state.swap.gtLimit || "N/A"}</div>
              <button class="primary-button" type="submit">Swap GT for RT</button>
            </form>

            <div style="height: 18px"></div>

            <form id="swap-rt-form" class="form-grid">
              <label>
                <span>Swap RT to GT</span>
                <input name="amount" type="number" min="1" step="1" placeholder="Amount of RT" required />
              </label>
              <div class="helper-text">Available RT: ${state.balances.rt}</div>
              <button class="secondary-button" type="submit">Swap RT for GT</button>
            </form>
          </section>

          <section class="glass-card">
            <div class="card-title-row">
              <div>
                <h2 class="card-title">Pool Snapshot</h2>
                <p class="muted">Read-only reserve and user limit details from the current AMM contract.</p>
              </div>
            </div>
            <div class="stat-grid">
              ${statCard("Reserve GT", state.swap.reserves?.gt || "N/A")}
              ${statCard("Reserve RT", state.swap.reserves?.rt || "N/A")}
              ${statCard("Fee Rate", state.swap.feeRate ? `${state.swap.feeRate} bp` : "N/A")}
              ${statCard("Your GT Limit", state.swap.gtLimit || "N/A")}
            </div>
            <div class="footer-note">
              The frontend auto-approves tokens first when allowance is insufficient, then calls the existing swap methods.
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function rewardsPage() {
    const rewards = state.rewards.length
      ? state.rewards
          .map(
            (reward) => `
              <article class="reward-card">
                <div class="list-item-top">
                  <h3>${escapeHtml(reward.name || `Reward #${reward.id}`)}</h3>
                  <span class="badge ${reward.active ? "" : "warning"}">${reward.active ? "Active" : "Inactive"}</span>
                </div>
                <p class="muted">Base cost: ${reward.baseCost} RT</p>
                <p class="small">Dynamic redemption cost is calculated by the existing reward contract against current RT reserves.</p>
                <button class="primary-button" data-redeem-id="${reward.id}" ${reward.active ? "" : "disabled"}>
                  Redeem
                </button>
              </article>`
          )
          .join("")
      : `<div class="empty-state">No rewards are available yet. Add reward items on-chain to populate this page.</div>`;

    return `
      <section class="page">
        ${renderFeedback()}
        <section class="glass-card">
          <div class="card-title-row">
            <div>
              <div class="section-kicker">Rewards</div>
              <h2 class="panel-title">Campus reward catalog</h2>
              <p class="muted">Card layout connected to the existing reward redemption contract.</p>
            </div>
            <div class="badge">Your RT balance: ${state.balances.rt}</div>
          </div>
          <div class="reward-grid">${rewards}</div>
        </section>
      </section>
    `;
  }

  function activityPage() {
    const items = state.activities.length
      ? state.activities
          .map(
            (item) => `
              <article class="activity-card">
                <div class="list-item-top">
                  <h3>${escapeHtml(item.title)}</h3>
                  <span class="badge">${item.status}</span>
                </div>
                <p class="muted">${escapeHtml(item.subtitle)}</p>
                <div class="small">${escapeHtml(item.meta)}</div>
                ${item.status === "Approved (Queued)" ? `<button class="secondary-button" data-claim-task="${item.id}">Claim Queued GT</button>` : ""}
              </article>`
          )
          .join("")
      : `<div class="empty-state">No recent activity found for this wallet yet.</div>`;

    return `
      <section class="page">
        ${renderFeedback()}
        <section class="glass-card">
          <div class="card-title-row">
            <div>
              <div class="section-kicker">Activity</div>
              <h2 class="panel-title">History & status timeline</h2>
              <p class="muted">Submission records and redemption events for the connected wallet.</p>
            </div>
          </div>
          <div class="reward-grid">${items}</div>
        </section>
      </section>
    `;
  }

  function profilePage() {
    return `
      <section class="page">
        ${renderFeedback()}
        <div class="profile-grid">
          ${userInfoCard(true)}
          <section class="glass-card">
            <div class="card-title-row">
              <div>
                <div class="section-kicker">Profile</div>
                <h2 class="panel-title">Account summary</h2>
                <p class="muted">Design language matches the landing page user card and stays ready for later expansion.</p>
              </div>
            </div>
            <div class="stat-grid">
              ${statCard("Email", state.user.email)}
              ${statCard("Wallet", shortAddress(state.account) || "Not connected")}
              ${statCard("Tier", state.user.tier)}
              ${statCard("Connection", state.account ? "Connected" : "Disconnected")}
            </div>
            <div class="footer-note">
              Contract addresses are read from <span class="mono">Frontend/code/config.js</span>.
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function userInfoCard(expanded = false) {
    return `
      <section class="glass-card">
        <div class="card-title-row">
          <div>
            <h2 class="card-title">${state.user.username}</h2>
            <p class="muted">${state.user.email}</p>
          </div>
          <div class="status-pill"><span class="status-dot"></span>${state.account ? "Connected" : "Not Connected"}</div>
        </div>
        <div class="list">
          <div class="list-item">
            <div class="small">Wallet Address</div>
            <div class="mono">${state.account ? shortAddress(state.account) : "Connect MetaMask to begin"}</div>
          </div>
          <div class="list-item">
            <div class="small">Level</div>
            <strong>${state.user.tier}</strong>
          </div>
          <div class="list-item">
            <div class="small">GT / RT</div>
            <strong>${state.balances.gt} GT / ${state.balances.rt} RT</strong>
          </div>
          ${expanded ? `
            <div class="list-item">
              <div class="small">Configured Contracts</div>
              <div class="mono small">${configuredContractSummary()}</div>
            </div>
          ` : ""}
        </div>
      </section>
    `;
  }

  function tokenBalanceCard(label, value, caption) {
    return `
      <article class="stat-card">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        <div class="small">${caption}</div>
      </article>
    `;
  }

  function statCard(label, value) {
    return `
      <article class="stat-card">
        <div class="label">${label}</div>
        <div>${value}</div>
      </article>
    `;
  }

  function featureCard(title, copy, href) {
    return `
      <article class="feature-card">
        <h3>${title}</h3>
        <p class="muted">${copy}</p>
        <a class="feature-link" href="${href}">Open page</a>
      </article>
    `;
  }

  function renderFeedback() {
    const notes = [
      ...state.notifications.map((text) => `<div class="banner">${escapeHtml(text)}</div>`),
      ...state.issues.map((text) => `<div class="banner warning">${escapeHtml(text)}</div>`),
    ].join("");

    return notes ? `<div class="stack" style="margin-bottom: 18px">${notes}</div>` : "";
  }

  function pushNotification(message) {
    state.notifications = [message];
    state.issues = [];
  }

  function pushIssue(message) {
    if (!state.issues.includes(message)) state.issues = [message, ...state.issues].slice(0, 3);
  }

  function configuredContractSummary() {
    const ready = Object.entries(CONFIG.contracts)
      .filter(([, address]) => address)
      .map(([key]) => key);
    return ready.length ? ready.join(", ") : "No contract addresses configured yet";
  }

  function shortAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function parseError(error, fallback) {
    return error?.shortMessage || error?.reason || error?.message || fallback;
  }

  function safeBigInt(value) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }

  function applySlippage(amount, bps) {
    const raw = BigInt(amount.toString());
    return (raw * BigInt(10000 - bps)) / 10000n;
  }

  function taskStatusLabel(code) {
    if (code === 1) return "Approved";
    if (code === 2) return "Rejected";
    return "Pending";
  }

  function getRoute() {
    const hash = window.location.hash.replace(/^#\//, "");
    return routes.some((route) => route.id === hash) ? hash : "landing";
  }

  function setRoute(route) {
    window.location.hash = `#/${route}`;
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
