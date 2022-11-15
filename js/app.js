initDataElements();
const isAppleDevice = (window.navigator.userAgent.match(/iPad/) || window.navigator.userAgent.match(/iPhone/));
checkAnim();

let POS_address = '';

const chart = {
  instance: null
};

const posPool = {

  contract: null,
  chainStatus: null,
  total: {
    totalLocked: null,
    totalRevenue: null,
    apy: null,
    stakerNumber: null,
    keys: {
      core: {
        totalLocked: false,
        totalRevenue: false,
        apy: false,
        stakerNumber: false,
      }, 
      espace: {
        totalLocked: false,
        totalRevenue: false,
        apy: false,
        stakerNumber: false,
      },
      total: {
        totalLocked: false,
        totalRevenue: false,
        apy: false,
        stakerNumber: false,
      }      
    }
  },
  
  core: {

    userData: {},

    chainStatus: {},
    poolInfo: {
      // status: 'Good', // TODO load the real pool status
      status: {},
      name: '',
      totalLocked: 0,
      totalRevenue: 0,
      userShareRatio: 0n,
      apy: 0,
      lastRewardTime: 0,
      stakerNumber: '0',
      posAddress: '',
      inCommittee: false,
      totalLockedRaw: 0,
      totalRevenueRaw: 0,
    },
    userInfo: {
      balance: 0,
      connected: false,
      votes: 0n,
      available: 0n,
      userInterest: 0,
      account: '',
      locked: 0n,
      unlocked: 0n,
      userInQueue: [],
      userOutOueue: [],
      nftCount: 0,
    },
    stakeCount: 0,  // stake input value
    unstakeCount: 0, // unstake input value
    withdrawCount: 0,
    txhash: '',
    coreAccount: '',
    coreBlockNumber: '',
    coreEpoch: '',


    connectWallet: async function () {


      const network = _CORE;
      clog.log("connectWallet:", network);

      if (!window.conflux) {
        showError('Please install Fluent Wallet');
        return;
      }

      let status = null;
      try {
        status = await confluxRequest({ method: 'cfx_getStatus' });
      } catch (e) {
        clog.log(e);
        showError('Wrong network. Please switch Fluent to Conflux Core mainnet.');
        return;
      }

      let netId = Number(status.chainId);
      if (netId != CORE_MAIN_NET.networkId) {
        showError('Wrong network. Please switch Fluent to Conflux Core mainnet.');
        return;
      }

      const account = await this._requestAccount();
      if (!account) {
        clog.log('RequestAccounts failed');
        showError('Could not get Wallet address from Fluent.');
        return;
      }
      
      posPool.setUserInfo("account", account, network);
      posPool.setUserInfo("connected", true, network);

      posPool.contract.setCoreProvider(window.conflux);

      localStorage.setItem('coreConnected', true);

      /*
      const balance = await this._loadUserData();
      if (!balance && balance !== 0) {
        clog.log('Balance loading failed');
        showError('Could not get Wallet balance from Fluent.');
        return;
      }
      */

      await posPool.loadAllUserInfo(network);
      //this.loadUserNFTInfo();

      posPool.contract.setCoreProvider(window.conflux);

      await posPool.loadCoreChainInfo();

      // TODO:
			// - Add connection info
			// - Remove connection button
			// - Fetch user data and display

    },

    _requestAccount: async function () {
      const accounts = await confluxRequest({
        method: "cfx_requestAccounts"
      });
      if (typeof accounts[0] == "undefined") {
        return null;
      }
      const account = accounts[0];
      if (!account) return null;
      this.userData.account = account;
      this.userData.connected = true;
      return account;
    },

    _loadUserData: async function () {
      const balance = await confluxClient.cfx.getBalance(this.userData.account);
      const _balance = TreeGraph.Drip(balance).toCFX();
      clog.log("bal", _balance, balance);
      this.userData.balance = _balance;
      return _balance;
    },
    

  },
  espace: {

    userData: {},

    chainStatus: {},
    poolInfo: {
      // status: 'Good', // TODO load the real pool status
      status: {},
      name: '',
      totalLocked: 0,
      totalRevenue: 0,
      userShareRatio: 0n,
      apy: 0,
      lastRewardTime: 0,
      stakerNumber: '0',
      posAddress: '',
      inCommittee: false,
    },
    userInfo: {
      balance: 0,
      connected: false,
      votes: 0n,
      available: 0n,
      userInterest: 0,
      account: '',
      locked: 0n,
      unlocked: 0n,
      userInQueue: [],
      userOutOueue: [],
      nftCount: 0,
    },
    stakeCount: 0,  // stake input value
    unstakeCount: 0, // unstake input value
    withdrawCount: 0,
    txhash: '',
    eSpaceBlockNumber: 0,
    eSpaceAccount: '',

    

    connectWallet: async function () {

      const network = _ESPACE;
      clog.log("connectWallet:", network);

      if (typeof window.ethereum === 'undefined') {
        clog.log("metamask not installed");
        showError('Please install Metamask');
        return;
      }

      if (ethereum.networkVersion != ESPACE_MAIN_NET.networkId) {
        clog.log("wrong network", ethereum.networkVersion);
        showError('Wrong network. Please switch Metamask to Conflux ESpace mainnet.');
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts.length === 0) {
        clog.log('RequestAccounts failed');
        showError('Could not get Wallet address from Metamask.');
        return;
      }

      localStorage.setItem('espaceConnected', true);

      const account = accounts[0];

      posPool.setUserInfo("account", account, network);
      posPool.setUserInfo("connected", true, network);

      /*
      const _balance = await provider.getBalance(account);
      const balance = ethers.utils.formatEther(_balance);
      if (!balance && balance !== 0) {
        clog.log('Balance loading failed', _balance, balance);
        showError('Could not get Wallet balance from Metamask.');
        return;
      }
      posPool.setUserInfo("balance", balance, network);
      */
     
     

      posPool.contract.setESpaceProvider(provider);
      
      let blockNumber = await provider.getBlockNumber()

      //console.log("espaceBlockNumber", blockNumber);

      posPool.espace.eSpaceBlockNumber = blockNumber;      

      await posPool.loadAllUserInfo(network);
      // posPool.loadUserNFTInfo();

      await posPool.loadCoreChainInfo();


      // TODO:
			// - Add connection info
			// - Remove connection button
			// - Fetch user data and display

    },

  },


  init: async function() {
    this.contract = new PoSPoolContract({
      network: null,
      coreAddress: CORE_MAIN_NET.poolAddress,
      coreRpc: CORE_MAIN_NET.url,
      coreNetId: CORE_MAIN_NET.networkId,
      eSpaceAddress: ESPACE_MAIN_NET.poolAddress,
      eSpaceRpc: ESPACE_MAIN_NET.url,
      eSpaceNetId: ESPACE_MAIN_NET.networkId,
    });

    // load pool info from both networks

    this.loadPoolInfo(_CORE);
    this.loadPoolInfo(_ESPACE);
    this.loadCoreChainInfo();
    await this.loadPoolMetaInfo(_CORE);
    await this.loadPoolMetaInfo(_ESPACE);

    // this info from Core only
    this.loadRewardChartData();
    this.loadLastRewardTime();
    this.loadPosNodeStatus();

    if (localStorage.getItem('espaceConnected') == 'true')
    {
      this.espace.connectWallet();
    }
    if (localStorage.getItem('coreConnected') == 'true')
    {
      this.core.connectWallet();
    }


  },

  loadAllUserInfo: async function(network) {
    this.loadUserInfo(network);
    this.loadUserLockingList(network);
    this.loadUserUnlockingList(network);
  },

  loadUserInfo: async function(network) {
    const account = this.getUserInfo("account", network);

    const userSummary = await this.contract.userSummary(account, network);
    this.setUserInfo("votes", userSummary.votes, network);
    this.setUserInfo("available", userSummary.available, network);
    this.setUserInfo("locked", userSummary.locked, network);
    this.setUserInfo("unlocked", userSummary.unlocked, network);

    clog.log("loadUserInfo", "account:", account);
    const userInterest = await this.contract.userInterest(account, network);
    this.setUserInfo("userInterest", trimPoints(TreeGraph.Drip(userInterest.toString()).toCFX()), network);

    const balance = await this.contract.getBalance(account, network);
    this.setUserInfo("balance", trimPoints(TreeGraph.Drip(balance.toString()).toCFX()), network);
  },

  loadUserLockingList: async function(network) {
    const account = this.getUserInfo("account", network);

    let list = await this.contract.userInQueue(account, network);
    if (network === _CORE)
    {
      //this.userInfo.userInQueue = list.map(this.mapQueueItemCore);
      this.setUserInfo("userInQueue", list.map(this.mapQueueItemCore), network);
    } else
    {
      //this.userInfo.userInQueue = list.map(this.mapQueueItemESpace);
      this.setUserInfo("userInQueue", list.map(this.mapQueueItemESpace), network);
    }
  },

  loadUserUnlockingList: async function(network) {
    const account = this.getUserInfo("account", network);

    let list = await this.contract.userOutQueue(account, network);
    if (network === _CORE)
    {
      this.setUserInfo("userOutQueue", list.map(this.mapQueueItemCore, network), network);
    } else
    {
      this.setUserInfo("userOutQueue", list.map(this.mapQueueItemESpace, network), network);
    }
  },

  loadRewardChartData: async function() {
    const posAddress = POS_address;
    const url = `${CORE_MAIN_NET.scan}/stat/list-pos-account-reward?identifier=${posAddress}&limit=40&orderBy=createdAt&reverse=true`;
    fetch(url)
      .then(response => response.json())
      .then(initLineChart);
  
  },
  

  setUserInfo: function(key, val, network) {
    if (network === _CORE)
    {
      this.core.userInfo[key] = val;
    } 
    if (network === _ESPACE)
    {
      this.espace.userInfo[key] = val;
    }
    clog.log("setUserInfo", network, key, val);

    let _val;
    let _id = network + '.userInfo.' + key;

    switch(key) {
      case 'account':
        updateUIData2(_id, shortenAccount(val), false);
        updateUItitle(_id, val);
        break;
      case 'connected':
        if (val === true) {
          if (network===_CORE) {
            $(".onCoreEnable").removeClass("disabled");
            $(".onCoreHide").hide();
            $(".onCoreShow").show();
          } else {
            $(".onEspaceEnable").removeClass("disabled");
            $(".onEspaceHide").hide();
            $(".onEspaceShow").show();
          }
          updateConnectedState(network, "online");
        }
             
        break;
      case 'userInQueue':
      case 'userOutQueue':
        let _str = '';
        let _netname = _NAMES[network];
        if (val.length == 0) {
          _str += '<tr class="disabled"><td class="tdamount">-</td><td class="tdtime">-</td><td class="tdnetwork">'+_netname+'</td></tr>';
        }
        for (const data of val) {
          let isFinished = '';
          if (data.isFinished) {
            if (key=='userInQueue') {
              isFinished = '<span title="These CFX should be now locked.">✅</span>';
            } else {
              isFinished = '<span title="These CFX should be now unlocked.">✅</span>';
            } 
          } else
          {
            if (key=='userInQueue') {
              isFinished = '<span title="These CFX are still locking.">🔄</span>';
            } else {
              isFinished = '<span title="These CFX are still unlocking.">🔄</span>';
            }            

          }

          _str += '<tr><td class="tdamount">'+data.amount+'</td><td class="tdtime">'+data.endTime+' '+isFinished+'</td><td class="tdnetwork">'+_netname+'</td></tr>';
        }
        updateUItable(_id, _str);
        break;
      case 'votes':
      case 'available':
      case 'locked':
      case 'unlocked':
        _val = Number(val) * ONE_VOTE_CFX;
        if(key=='unlocked' && _val > 0)
        {
          showTimedNotice("⚠️ You have "+_val+" CFX currently not producing any rewards! Please Withdraw these CFX and Stake them again if you want to get Rewards again hourly!", 180000);
        }
        updateUIData2(_id, _val);
        break;
      case 'userInterest':
      case 'balance':
        updateUIData2(_id, Number(val));
        break;    

    }
  },

  getUserInfo: function(key, network) {
    if (network === _CORE)
    {
      return this.core.userInfo[key];
    } 
    return this.espace.userInfo[key];
    
  },

  setPoolInfo: function(key, val, network) {
    if (network === _CORE)
    {
      this.core.poolInfo[key] = val;
    }
    if (network === _ESPACE)
    {
      this.espace.poolInfo[key] = val;
    }
    clog.log("setPoolInfo", network, key, val);
    
    let _id = network+".poolInfo." + key;
    let _tid =  "total." + key;

    switch(key) {
      case 'stakerNumber':
        
        if (network === _CORE) {
          updateUIData2(_tid, val);
        } else {
          updateUIData2(_id, val);
        }
        this.total.keys[network][key] = true;
        this.countTotals();    
        break;
      case 'apy':
        if (network === _CORE) {
          updateUIData2(_tid, val);
        } else {
          updateUIData2(_id, val);
        }
        this.total.keys[network][key] = true;
        this.countTotals();    
        break;
      case 'totalLocked':
        if (network === _CORE) {
          updateUIData2(_tid, formattedCFX(val));
        } else {
          updateUIData2(_id, formattedCFX(val));
        }
        this.total.keys[network][key] = true;
        this.countTotals();    
        break;
      case 'totalRevenue':
        if (network === _CORE) {
          updateUIData2(_tid, formattedCFX(val));
        } else {
          updateUIData2(_id, formattedCFX(val));
        }
        this.total.keys[network][key] = true;
        this.countTotals();    
        break;
      case 'posAddress':
        if (network===_CORE) {
          updateUILink("PosConfluxscan", "https://confluxscan.io/pos/accounts/" + val);        
          updateUIData("shortPosAddress", shortPosAddress(val), false);  
        }
        break;
      case 'userShareRatio':
        if (network===_CORE) {
          updateUIData2("poolFee", feeRatio(val));  
        }
        break;
      case 'lastRewardTime':
        updateUIData2(_id, formatDateTime(new Date(val * 1000)), false);  
      break;
    }



  },

  countTotals: function() {
    
    const keys = ["stakerNumber", "apy", "totalLocked", "totalRevenue"];

    for (const key of keys) {

      if (this.total.keys.total[key] || !this.havePoolKeys(key)) {
        //clog.log("CountTotals.continue", key)
        continue;
      }

      let val;      

      let _id = _CORE + ".poolInfo." + key;

      switch (key)
      {
        case 'stakerNumber':
          clog.log("countTotals.proceed", key);
          val = this.substractPoolKeys(key, false);
          updateUIData2(_id, val);
          this.total.keys.total[key] = true;
          break;

        case 'apy':
          if (this.havePoolKeys("stakerNumber") && this.havePoolKeys("totalLocked"))
          {           
            clog.log("countTotals.proceed", key);
            
            let sumlocked = Number(this.getPoolInfo("totalLockedRaw", _CORE));
            //let clocked = Number(this.substractPoolKeys("totalLockedRaw"));
            let capy = Number(this.getPoolInfo("apy", _CORE));
            let elocked = Number(this.getPoolInfo("totalLockedRaw", _ESPACE));
            let eapy = Number(this.getPoolInfo("apy", _ESPACE));
            //clog.log("DATAA", clocked, capy, sumlocked, elocked, eapy);

            val = (capy - (elocked / sumlocked * eapy)) / (1-(elocked/sumlocked));
            //clog.log(val);
            val = Math.round(val*100)/100;
            updateUIData2(_id, val);
            this.total.keys.total[key] = true;
          }
          break;

        case 'totalLocked':
          clog.log("countTotals.proceed", key);
          val = formattedCFX(this.substractPoolKeys(key+"Raw") * 1000000000000000000);
          updateUIData2(_id, val);
          this.total.keys.total[key] = true;
          break;

        case 'totalRevenue':          
          clog.log("countTotals.proceed", key);
          val = formattedCFX(this.substractPoolKeys(key+"Raw"));
          updateUIData2(_id, val);
          this.total.keys.total[key] = true;
          break;
      }

      
    }

    

  },

  sumPoolKeys: function(key, isCFX=true) {
    if (isCFX)
    {
      return Number(this.getPoolInfo(key, _CORE)) + Number(this.getPoolInfo(key, _ESPACE));
    } else
    {
      return Number(this.getPoolInfo(key, _CORE)) + Number(this.getPoolInfo(key, _ESPACE));
    }
  },

  substractPoolKeys: function(key, isCFX=true) {
    if (isCFX)
    {
      return Number(this.getPoolInfo(key, _CORE)) - Number(this.getPoolInfo(key, _ESPACE));
    } else
    {
      return Number(this.getPoolInfo(key, _CORE)) - Number(this.getPoolInfo(key, _ESPACE));
    }
    
  },

  havePoolKeys: function(key) {
    return this.total.keys[_CORE][key]!==false && this.total.keys[_ESPACE][key]!==false;
  },

  getPoolInfo: function(key, network) {
    if (network === _CORE)
    {
      return this.core.poolInfo[key];
    } 
    return this.espace.poolInfo[key];
    
  },

  loadCoreChainInfo: async function() {
    const status = await confluxClient.cfx.getStatus();
    this.chainStatus = status;
    //TODO: Update Epoch and Block to UI
    updateUIData2("chainStatus.epochNumber", this.chainStatus.epochNumber, true, 4000);
    updateUIData2("chainStatus.blockNumber", this.chainStatus.blockNumber, true, 4000);

    return status;
  },

  // only need load once
  loadPoolMetaInfo: async function(network) {
    if (network === _CORE)
    {
      this.setPoolInfo("name", this.contract.poolName(), _CORE);
      this.setPoolInfo("name", this.contract.poolName(), _ESPACE);
      let poolPosAddress = await this.contract.posAddress();
      POS_address = TreeGraph.format.hex(poolPosAddress);
      this.setPoolInfo("posAddress", POS_address, _CORE);
      this.setPoolInfo("posAddress", POS_address, _ESPACE);
    }
    let _ratio = await this.contract.poolUserShareRatio(network);
    this.setPoolInfo("userShareRatio", _ratio, network);    
  },



  loadPoolInfo: async function(network) {
    clog.log("loadPoolInfo", network);
    const poolSummary = await this.contract.poolSummary(network);
  
    const totalLockedRaw = poolSummary.available * BigInt(ONE_VOTE_CFX);
    const totalLocked = totalLockedRaw * BigInt("1000000000000000000");
    this.setPoolInfo("totalLockedRaw", totalLockedRaw, network);
    this.setPoolInfo("totalLocked", totalLocked, network);

    const totalRevenueRaw = poolSummary.totalInterest;
    const totalRevenue = totalRevenueRaw;
    this.setPoolInfo("totalRevenueRaw", totalRevenueRaw, network);
    this.setPoolInfo("totalRevenue", totalRevenue, network);

    const apy = Number(await this.contract.poolAPY(network)) / 100;
    this.setPoolInfo("apy", apy, network);
    
    const stakerNumber = await this.contract.stakerNumber(network);
    clog.log("stakerNumber:"+network, stakerNumber, stakerNumber.toString());
    this.setPoolInfo("stakerNumber", stakerNumber.toString(), network);

  },

  loadPosNodeStatus: async function() {
    const account = await confluxClient.pos.getAccount(POS_address);
    let status = account.status;
    this.setPoolInfo("status", status, _CORE);
    this.setPoolInfo("status", status, _ESPACE);
  },

  loadLastRewardTime: async function() {
    const {epoch} = await confluxClient.pos.getStatus();
    let lastReward = await confluxClient.pos.getRewardsByEpoch(epoch - 1);
    if (!lastReward) {
      lastReward = await confluxClient.pos.getRewardsByEpoch(epoch - 2);
    }
    const block = await confluxClient.cfx.getBlockByHash(lastReward.powEpochHash, false);
    let timestamp = block.timestamp;
    this.setPoolInfo("lastRewardTime", timestamp, _CORE);
    this.setPoolInfo("lastRewardTime", timestamp, _ESPACE);

  },


  mapQueueItemCore: function(item) {
    const network = _CORE;

    let now = new Date().getTime();
    let unlockTime;
    let isFinished;
    if (network == _CORE) {
      let unlockBlockNumber = Number(item.endBlock) - posPool.chainStatus.blockNumber;
      unlockTime = new Date(now + unlockBlockNumber / 2 * 1000);
      isFinished = (unlockTime <= now);      
    } else {
      let unlockBlockNumber = Number(item.endBlock) - posPool.espace.eSpaceBlockNumber;
      unlockTime = new Date(now + unlockBlockNumber * 1000);
      isFinished = (unlockTime <= now);
    }
    return {
      amount: voteToCFX(item.votePower),
      endTime: formatDateTime(unlockTime),
      isFinished: isFinished,
    }

  },

  mapQueueItemESpace: function(item) {
    const network = _ESPACE;

    let now = new Date().getTime();
    let unlockTime;
    let isFinished;
    if (network == _CORE) {
      let unlockBlockNumber = Number(item.endBlock) - posPool.chainStatus.blockNumber;
      unlockTime = new Date(now + unlockBlockNumber / 2 * 1000);
      isFinished = (unlockTime <= now);      
    } else {
      
      let unlockBlockNumber = Number(item.endBlock) - posPool.espace.eSpaceBlockNumber;
      unlockTime = new Date(now + unlockBlockNumber * 1000);
      //console.log("espaceQueue", item.endBlock, posPool.espace.eSpaceBlockNumber, now, unlockBlockNumber);
      isFinished = (unlockTime <= now);
    }
    return {
      amount: voteToCFX(item.votePower),
      endTime: formatDateTime(unlockTime),
      isFinished: isFinished,
    }
  },

  stake: async function(network) {
    let stake = Number(getInputValue(network + ".stake"));
    let account = this.getUserInfo("account", network);
    if (stake === 0 || stake % ONE_VOTE_CFX != 0 ) {
      showError('Stake CFX count should be multiple of 1000. For.ex. 1000, or 4000');
      return;
    }
    if (Number(this.getUserInfo("balance", network)) < Number(stake)) {
      showError('Insufficient balance on ' + network + " network");
      return;
    }

    showTimedNotice("Confirm the stake transaction in your browser wallet", 3000);

    const hash = await this
      .contract
      .increaseStake(stake, account, network);
    
    showHashPopup(hash, network);

    this.contract.waitTx(hash, network).then(receipt => {
      
      if (receipt.status === 0) { // success

        showHashReadyPopup(hash, network);

        this.loadUserInfo(network);
        this.loadUserLockingList(network);
        this.loadUserUnlockingList(network);

        setInputValue(network + ".stake", "");  // clear stake count

      } else {

        showHashErrorPopup("Sorry! Stake transaction failed.", hash, network);

      }
    });
  }, 

  claim: async function(network) {
    let account = this.getUserInfo("account", network);
    let interest = this.getUserInfo("userInterest", network);

    if (interest == 0) {
      showError('Sorry! No claimable rewards yet');
      return;
    }

    showTimedNotice("Confirm the reward claim transaction in your browser wallet", 3000);

    let hash = await this
      .contract
      .claimAllInterest(account, network);
    
     
    showHashPopup(hash, network);

    this.contract.waitTx(hash, network).then(receipt => {
      if (receipt.status === 0) {

        showHashReadyPopup(hash, network);

        this.loadUserInfo(network);
        this.loadUserLockingList(network);
        this.loadUserUnlockingList(network);

      } else {

        showHashErrorPopup("Sorry! Reward claim transaction failed.", hash, network);

      }
    });
  }, 

  unstake: async function(network) {
    let account = this.getUserInfo("account", network);
    let locked = this.getUserInfo("locked", network);
    let unstake = Number(getInputValue(network + ".unstake"));

    if (locked === BigInt(0)) {
      showError('Sorry! There is no unstakeable funds available');
      return;
    }
    if (unstake === 0 || unstake % ONE_VOTE_CFX != 0 ) {
      showError('Unstake count should be multiple of 1000');
      return;
    }
    const unstakeVotePower = unstake / ONE_VOTE_CFX;

    showTimedNotice("Confirm the unstake transaction in your browser wallet", 3000);

    let hash = await this
      .contract
      .decreaseStake(unstakeVotePower, account, network);

    showHashPopup(hash, network);

    this.contract.waitTx(hash, network).then(receipt => {

      if (receipt.status === 0) {
        showHashReadyPopup(hash, network);

        this.loadUserInfo(network);
        this.loadUserLockingList(network);
        this.loadUserUnlockingList(network);

        setInputValue(network + ".unstake", ""); // clear unstake count
      } else {

        showHashErrorPopup("Sorry! Unstake transaction failed.", hash, network);

      }
    });
  },

  withdraw: async function(network) {

    let account = this.getUserInfo("account", network);
    let unlocked = this.getUserInfo("unlocked", network);
    let withdraw = Number(getInputValue(network + ".withdraw"));

    if (unlocked === BigInt(0)) {
      showError('Sorry! There is no withdrawable funds available');
      return;
    }

    if (withdraw === 0 || withdraw % ONE_VOTE_CFX != 0 ) {
      alert('Unstake count should be multiple of 1000');
      return;
    }

    const withdrawVotePower = withdraw / ONE_VOTE_CFX;

    showTimedNotice("Confirm the withdraw transaction in your browser wallet", 3000);

    try {
      let hash = await this
        .contract
        .withdrawStake(withdrawVotePower, account, network);

      showHashPopup(hash, network);

      this.contract.waitTx(hash).then(receipt => {

        if (receipt.status === 0) {

          showHashReadyPopup(hash, network);

          this.loadUserInfo(network);
          this.loadUserLockingList(network);
          this.loadUserUnlockingList(network);

        } else {

          showHashErrorPopup("Sorry! Withdraw transaction failed.", hash, network);

        }
      });
    } catch(err) {

      showError("Please try to withdraw small amount or wait for a few hours and try again. ("+String(err)+")");
      
    }
  },



}

// JQuery ready 
$(function () {

	$("#bg-anim-toggle").click(function() {
    animToggleClick();
	});

  $("#top-bar-conf-btn").click(function() {
    $("#top-bar-conf-cmds").toggle();
    $("#top-bar-conf-btn").toggleClass("btn-is-active");
	});
  

  $("#fluent-button .wallet-button-text").click(function () {
    showTimedNotice("Attempting connecting to Fluent Wallet.", 3000);
    posPool.core.connectWallet();
  });

  $("#mm-button .wallet-button-text").click(function () {
    showTimedNotice("Attempting connecting to Metamask Wallet.", 3000);
    posPool.espace.connectWallet();
  });

  $("#info-button-text").click(function () {
    showPopup("popup4");
  });

  $(".info-faq-heading").click(function () {
    let faq = $(this).attr("data-faq");
    toggleFaq(faq);
  });

  $("[data-button-id]").click(function () {
    let btn = String( $(this).attr("data-button-id") );
    clog.log(btn);

    let arr = btn.split('.');
    let network = arr[0];
    let fn = arr[1];
    posPool[fn](network);
  });

  $("#old-news-show").click(function() {
    $("#old-news-show").hide();
    $("#old-news-text").show();
  });

  posPool.init();
  

});


// Main

let currentChainId = CORE_MAIN_NET.networkId;
let scanUrl = CORE_MAIN_NET.scan;

let confluxClient = new TreeGraph.Conflux(CORE_MAIN_NET);
let espaceProvider = new ethers.providers.JsonRpcProvider(ESPACE_MAIN_NET.url);




