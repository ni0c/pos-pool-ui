
class PoSPoolContract {

  constructor(options) {
    this.options = options;
    const {
      network,  // current network: Core/eSpace
      coreAddress, 
      coreRpc, 
      coreNetId,
      eSpaceAddress,
      eSpaceRpc,
      eSpaceNetId,
    } = options;
    
    if (eSpaceAddress && eSpaceRpc) {
      const provider = new ethers.providers.JsonRpcProvider(eSpaceRpc);
      const eSpaceContract = new ethers.Contract(eSpaceAddress, PoSPoolABI, provider);
      this.eSpaceContract = eSpaceContract;
      this.ethClient = provider;
    }

    this.network = network;
    this.cfxClient = new TreeGraph.Conflux({
      url: coreRpc,
      networkId: coreNetId,
      // logger: console,
    });
    this.coreContract = this.cfxClient.Contract({
      abi: PoSPoolABI,
      address: coreAddress,
    });


  }

  // Core/eSpace -- not used
  setCurrentNetwork(network) {
    this.network = network;
  }

  setESpaceProvider(provider) {
    this.ethClient = provider;
    const signer = provider.getSigner();
    this.eSpaceContract = this.eSpaceContract.connect(signer);
  }

  setCoreProvider(provider) {
    this.cfxClient.provider = provider;
  }

  isCore(network) {
    return (network===_CORE);
  }

  contract(network) {
    return this.isCore(network) ? this.coreContract : this.eSpaceContract;
  }

  async getBalance(addr, network) {
    let balance;
    if (this.isCore(network)) {
      balance = await this.cfxClient.cfx.getBalance(addr);
    } else {
      balance = await this.ethClient.getBalance(addr);
    }
    return bnToBigInt(balance);
  }

  async userSummary(addr, network) {
    let userSummary;
    userSummary = await this.contract(network).userSummary(addr);
    
    return {
      votes: bnToBigInt(userSummary[0]),
      available: bnToBigInt(userSummary[1]),
      locked: bnToBigInt(userSummary[2]),
      unlocked: bnToBigInt(userSummary[3]),
      claimedInterest: bnToBigInt(userSummary[4]),
      currentInterest: bnToBigInt(userSummary[5]),
    };     
  }

  async poolSummary(network) {
    let poolSummary = await this.contract(network).poolSummary();
   
    return {
      available: bnToBigInt(poolSummary[0]),
      interest: bnToBigInt(poolSummary[1]),
      totalInterest: bnToBigInt(poolSummary[2]),
    };
  }

  async stakerNumber(network) {
    let stakerNumber = await this.contract(network).stakerNumber();
    return bnToBigInt(stakerNumber);
  }

  async poolAPY(network) {
    let poolAPY = await this.contract(network).poolAPY();
    return bnToBigInt(poolAPY);
  }

  async userInterest(addr, network) {
    let interest = await this.contract(network).userInterest(addr);
    return bnToBigInt(interest);
  }

  async poolUserShareRatio(network) {
    let ratio = await this.contract(network).poolUserShareRatio();
    return bnToBigInt(ratio);
  }

  async poolName() {
    const poolName = await this.coreContract.poolName();
    return poolName;
  }

  async posAddress() {
    const posAddress = await this.coreContract.posAddress();
    return posAddress;
  }

  async userOutQueue(address, network) {
    let userOutQueue = await this.contract(network)['userOutQueue(address)'](address);
    return userOutQueue.map(item => ({
      votePower: bnToBigInt(item[0]),
      endBlock: bnToBigInt(item[1]),
    }));
  }

  async userInQueue(address, network) {
    let userInQueue = await this.contract(network)['userInQueue(address)'](address);
    return userInQueue.map(item => ({
      votePower: bnToBigInt(item[0]),
      endBlock: bnToBigInt(item[1]),
    }));
  }

  async increaseStake(stakeAmount, account, network) {
    const votes = stakeAmount / 1000;
    if (this.isCore(network)) {
      const txHash = await this.coreContract
        .increaseStake(votes)
        .sendTransaction({
          from: account,
          value: TreeGraph.Drip.fromCFX(stakeAmount),
        });
      return txHash;
    } else {
      let tx = await this.eSpaceContract.increaseStake(votes, {
        value: ethers.utils.parseEther(stakeAmount.toString())
      });
      return tx.hash;
    }
  }

  async decreaseStake(votes, account, network) {
    if (this.isCore(network)) {
      const txHash = await this.coreContract
        .decreaseStake(votes)
        .sendTransaction({
          from: account,
        });
      return txHash;
    } else {
      let tx = await this.eSpaceContract.decreaseStake(votes);
      return tx.hash;
    }
  }

  async claimAllInterest(account, network) {
    if (this.isCore(network)) {
      const txHash = await this.coreContract
        .claimAllInterest()
        .sendTransaction({
          from: account,
        });
      return txHash;
    } else {
      let tx = await this.eSpaceContract.claimAllInterest();
      return tx.hash;
    }
  }

  async withdrawStake(votes, account, network) {
    if (this.isCore(network)) {
      const txHash = await this.coreContract
        .withdrawStake(votes)
        .sendTransaction({
          from: account,
        });
      return txHash;
    } else {
      let tx = await this.eSpaceContract.withdrawStake(votes);
      return tx.hash;
    }
  }

  async waitTx(hash, network) {
    if (this.isCore(network)) {
      let count = 0;
      while(count < 20) {
        let receipt = await this.cfxClient.cfx.getTransactionReceipt(hash);
        if (receipt) {
          return {
            receipt,
            status: receipt.outcomeStatus,  // 0: success other: failed
          };
        }
        await usleep(3000);  // wait 3s
        count++;
      }
    } else {
      let count = 0;
      while(count < 20) {
        let receipt = await this.ethClient.getTransactionReceipt(hash);
        if (receipt) {
          return {
            receipt,
            status: receipt.status === 1 ? 0 : 1,  // 0: success other: failed
          };
        }
        await usleep(3000);  // wait 3s
        count++;
      }
    }
    return null;
  }
}
