const MAINNET = {
  url: 'https://main.confluxrpc.com',
  networkId: 1029,
  poolAddress: 'cfx:acc5086t6uyww6barn1a2b6z8wdmdg376yeu9gczpz',
  scan: 'https://confluxscan.io'
};

const TESTNET = {
  url: 'https://test.confluxrpc.com',
  networkId: 1,
  poolAddress: '0x820e8a21ba781389f5715c7a04dba9847cfccb64',
  scan: 'https://testnet.confluxscan.io'
}

/* const NET8888 = {
  url: 'https://net8888cfx.confluxrpc.com',
  networkId: 8888,
  poolAddress: '0x8e38f187da01d54936142a5f209d05c7e85fadff',
  scan: ''
} */

let currentChainId = MAINNET.networkId;
let poolAddress = MAINNET.poolAddress;
let scanUrl = MAINNET.scan;

let confluxClient = new TreeGraph.Conflux(MAINNET);
// use wallet provider
if (window.conflux) {
  confluxClient.provider = window.conflux;
}

// used for send pos RPC methods
let appClient = new TreeGraph.Conflux(MAINNET);

console.log('SDK version: ', confluxClient.version);

var hashModal = new bootstrap.Modal(document.getElementById('hashModal'), {});

const PoSPool = {
  data() {
    return {
      chainStatus: {},
      poolInfo: {
        // status: 'Good', // TODO load the real pool status
        status: {},
        name: '',
        totalLocked: 0,
        totalRevenue: 0,
        userShareRatio: 0,
        apy: 0,
        lastRewardTime: 0,
        stakerNumber: '0',
        posAddress: '',
        inCommittee: false,
      },
      userInfo: {
        balance: 0,
        connected: false,
        userStaked: BigInt(0),
        userInterest: 0,
        account: '',
        locked: BigInt(0),
        unlocked: BigInt(0),
        userInQueue: [],
        userOutOueue: [],
      },
      stakeCount: 0,
      unstakeCount: 0,
      txhash: '',
    }
  },

  async created() {
    const status = await this.loadChainInfo();

    if (status.chainId !=  currentChainId) {
      if (status.chainId === TESTNET.networkId) {
        confluxClient = new TreeGraph.Conflux(TESTNET);
        confluxClient.provider = window.conflux;
        appClient = new TreeGraph.Conflux(TESTNET);
        poolAddress = TESTNET.poolAddress;
        scanUrl = TESTNET.scan;
      }
      currentChainId = status.chainId;
    }
    
    this.poolContract = confluxClient.Contract({
      abi: PoSPoolABI,
      address: poolAddress,
    });
    
    // load pool info
    this.loadPoolMetaInfo();
    this.loadPoolInfo();
    // await this.loadLastRewardInfo();
    // await this.loadPosNodeStatus();

    // auto connect user
    if (window.conflux && localStorage.getItem('userConnected')) {
      await this._requestAccount();
    }
  },

  mounted () {
    // toggle visibility of the app element
    const app = document.getElementById('app');
    app.setAttribute('class', 'container');
  },

  computed: {
    perFee() {
      return (BigInt(10000) - BigInt(this.poolInfo.userShareRatio)) / BigInt(100);
    },

    formatedTotalLocked() {
      return formatUnit(this.poolInfo.totalLocked.toString(), "CFX");
    },

    formatedTotalRevenue() {
      return formatUnit(this.poolInfo.totalRevenue.toString(), "CFX");
    },

    prettyTotalLocked() {
      const totalLocked = this.poolInfo.totalLocked;
      if (totalLocked === 0) return 0;
      return prettyFormat(totalLocked.toString());
    },

    prettyTotalRevenue() {
      const totalRevenue = this.poolInfo.totalRevenue;
      if (totalRevenue == 0) return 0;
      return prettyFormat(totalRevenue.toString());
    },

    userStakedCFX() {
      return this.userInfo.userStaked * BigInt(ONE_VOTE_CFX);
    },

    unstakeableCFX() {
      return this.userInfo.locked * BigInt(ONE_VOTE_CFX);
    },

    withdrawableCFX() {
      return this.userInfo.unlocked * BigInt(ONE_VOTE_CFX);
    },

    shortenAccount() {
      return TreeGraph.address.shortenCfxAddress(this.userInfo.account);
    },

    lastRewardTime() {
      const lastTime = new Date(this.poolInfo.lastRewardTime * 1000);
      return formatDateTime(lastTime);
    },

    shortPosAddress() {
      if (!this.poolInfo.posAddress) {
        return 'Loading...';
      }
      const start = this.poolInfo.posAddress.slice(0, 6);
      return `${start}...`;
    },

    posAddressLink() {
      return `${scanUrl}/pos/accounts/${this.poolInfo.posAddress}`;
    },

    shortHash() {
      if (!this.txhash) return '';
      return this.txhash.slice(0, 10) + '...';
    },

    txScanLink() {
      if (!this.txhash) return '#';
      return `${scanUrl}/transaction/${this.txHash}`;
    }
  },

  methods: {

    async loadChainInfo() {
      const status = await confluxClient.cfx.getStatus();
      this.chainStatus = status;
      return status;
    },

    async connectWallet() {
      if (!window.conflux) {
        alert('Please install Conflux Wallet');
        return;
      }
      // const accounts = await conflux.send("cfx_requestAccounts");
      const account = await this._requestAccount();
      if (!account) {
        alert('Request account failed');
      } else {
        localStorage.setItem('userConnected', true);
      }

    },

    async _requestAccount() {
      const accounts = await requestAccounts();
      const account = accounts[0];
      if (!account) return null;
      this.userInfo.account = account;
      this.userInfo.connected = true;
      this.loadUserInfo();
      await this.loadLockingList();
      await this.loadUnlockingList();
      return account;
    },

    mapQueueItem(item) {
      let now = new Date().getTime();
      // TODO chainStatus must have here
      let unlockBlockNumber = Number(item[1].toString()) - this.chainStatus.blockNumber;
      let unlockTime = new Date(now + unlockBlockNumber / 2 * 1000);
      return {
        amount: voteToCFX(item[0]),
        endTime: formatDateTime(unlockTime),
      }
    },

    async loadUserInfo() {
      const userSummary = await this.poolContract.userSummary(this.userInfo.account);
      this.userInfo.userStaked = BigInt(userSummary[0].toString());
      this.userInfo.locked = BigInt(userSummary[2].toString());
      this.userInfo.unlocked = BigInt(userSummary[3].toString());
      // this.userInfo.userInterest = TreeGraph.Drip(userSummary[5].toString()).toCFX();
      const userInterest = await this.poolContract.userInterest(this.userInfo.account);
      this.userInfo.userInterest = trimPoints(TreeGraph.Drip(userInterest.toString()).toCFX());

      const balance = await confluxClient.cfx.getBalance(this.userInfo.account);
      this.userInfo.balance = trimPoints(TreeGraph.Drip(balance).toCFX());
    },

    // only need load once
    async loadPoolMetaInfo() {
      this.poolInfo.name = await this.poolContract.poolName();
      this.poolInfo.userShareRatio = await this.poolContract.poolUserShareRatio();
      let poolAddress = await this.poolContract.posAddress();
      this.poolInfo.posAddress = TreeGraph.format.hex(poolAddress);
    },

    async loadPosNodeStatus() {
      const account = await appClient.pos.getAccount(this.poolInfo.posAddress);
      this.poolInfo.status = account.status;
      // console.log(this.poolInfo.status);

      const committee = await appClient.pos.getCommittee();
      let nodes = committee.currentCommittee.nodes.map(item => item.address);
      this.poolInfo.inCommittee = nodes.includes(this.poolInfo.posAddress);
      // console.log(nodes);
    },

    async loadPoolInfo() {
      const poolSummary = await this.poolContract.poolSummary();
      this.poolInfo.totalLocked = BigInt(poolSummary[0].toString()) * BigInt(ONE_VOTE_CFX) * BigInt("1000000000000000000");
      this.poolInfo.totalRevenue = BigInt(TreeGraph.Drip(poolSummary[2].toString()));
      this.poolInfo.apy = Number(await this.poolContract.poolAPY()) / 100;

      const stakerNumber = await this.poolContract.stakerNumber();
      this.poolInfo.stakerNumber = stakerNumber.toString();
    },

    async loadLastRewardInfo() {
      const {epoch} = await appClient.pos.getStatus();
      let lastReward = await appClient.pos.getRewardsByEpoch(epoch - 1);
      if (!lastReward) {
        lastReward = await appClient.pos.getRewardsByEpoch(epoch - 2);
      }
      const block = await appClient.cfx.getBlockByHash(lastReward.powEpochHash, false);
      this.poolInfo.lastRewardTime = block.timestamp;
    },

    async loadLockingList() {
      let list = await this.poolContract.userInQueue(this.userInfo.account);
      this.userInfo.userInQueue = list.map(this.mapQueueItem);
    },

    async loadUnlockingList() {
      let list = await this.poolContract.userOutQueue(this.userInfo.account);
      this.userInfo.userOutOueue = list.map(this.mapQueueItem);
    },

    async stake() {
      if (this.stakeCount === 0 || this.stakeCount % ONE_VOTE_CFX != 0 ) {
        alert('Stake count should be multiple of 1000');
        return;
      }

      const tx = this.poolContract
      .increaseStake(this.stakeCount / ONE_VOTE_CFX)
      .sendTransaction({
        from: this.userInfo.account,
        value: TreeGraph.Drip.fromCFX(this.stakeCount),
      });

      const hash = await tx;
      this.txHash = hash;
      hashModal.show();
      
      const receipt = await tx.executed();
      hashModal.hide();

      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        this.loadLockingList();
        this.stakeCount = 0;  // clear stake count
        // alert('Stake success');
      } else {
        alert('Stake failed');
      }
    }, 

    async claim() {
      if (this.userInfo.userInterest == 0 ) {
        alert('No claimable interest');
        return;
      }
      let tx = this.poolContract
        .claimAllInterest()
        .sendTransaction({
          from: this.userInfo.account,
        });

      const hash = await tx;
      this.txHash = hash;
      hashModal.show();

      const receipt = await tx.executed();
      hashModal.hide();

      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        // alert('Claim success');
      } else {
        alert('Claim failed');
      }
    }, 

    async unstake() {
      if (this.userInfo.locked === BigInt(0)) {
        alert('No unstakeable funds');
        return;
      }
      if (this.unstakeCount === 0 || this.unstakeCount % ONE_VOTE_CFX != 0 ) {
        alert('Unstake count should be multiple of 1000');
        return;
      }
      const unstakeVotePower = this.unstakeCount / ONE_VOTE_CFX;

      let tx = this.poolContract
      .decreaseStake(unstakeVotePower)
      .sendTransaction({
        from: this.userInfo.account,
      });

      const hash = await tx;
      this.txHash = hash;
      hashModal.show();

      let receipt = await tx.executed();
      hashModal.hide();

      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        this.loadUnlockingList();
        this.unstakeCount = 0;  // clear unstake count
        // alert('UnStake success');
      } else {
        alert('UnStake failed');
      }
    },

    async withdraw() {
      if (this.userInfo.unlocked === BigInt(0)) {
        alert('No withdrawable funds');
        return;
      }

      let tx = this.poolContract
      .withdrawStake(this.userInfo.unlocked.toString())
      .sendTransaction({
        from: this.userInfo.account,
      });

      const hash = await tx;
      this.txHash = hash;
      hashModal.show();

      const receipt = await tx.executed();
      hashModal.hide();
      
      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        // alert('Withdraw success');
      } else {
        alert('Withdraw failed');
      }
    }
  }
};

Vue.createApp(PoSPool).mount('#app');

/* function updateHash(hash) {
  const hashLink = document.getElementById('hashLink');
  hashLink.href = `${scanUrl}/tx/${hash}`;
  hashLink.innerText = hash.slice(0, 10) + '...';

  const modalEle = document.getElementById('hashModal');
  var hashModal = new bootstrap.Modal(modalEle, {});
  // 

  modalEle.addEventListener('hidden.bs.modal', function() {
    hashModal.dispose();
  });

  return hashModal;
} */
