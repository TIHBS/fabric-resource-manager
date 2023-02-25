/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const ResourceManagerContext = require('./resource-manager-context.js');
const TxDetails = require('./tx-details.js');
const TxState = require('./tx-state.js');
const LockType = require('./lock-type.js');
const Variable = require('./variable.js');
const { ClientIdentity } = require('fabric-shim');


class ResourceManager extends Contract {

  constructor(name) {
    super(name);
  }

  createContext() {
    return new ResourceManagerContext();
  }

  async instantiate(ctx) {
    console.log('Instantiate the contract');
  }

  /**
   * 
   * @param {ResourceManagerContext} ctx 
   * @param {string} txKey 
   */
  async _releaseLocks(ctx, txId) {
    let variables = await this._getAllLockedVariables(ctx, txId);

    for (let variable of variables) {
      await this._releaseLock(ctx, variable.getName(), txId);
    }

  }

  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {ResourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _releaseLock(ctx, variableName, txId) {
    // if it is WL, then it can only be us!
    if (await this._isWL(ctx, variableName)) {
      await this._releaseWL(ctx, variableName, txId);
    } else { // Otherwise, we certainly have a readlock on the variable (we know we have some lock :)).
      await this._releaseRL(ctx, variableName, txId);
    }
  }

  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {ResourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _releaseRL(ctx, variableName, txId) {
    let variable = await ctx.variableList.getVariable(variableName);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (variable && tx) {
      ResourceManager._releaseRL(variable, tx);
      await ctx.TxDetailsList.updateTxDetails(tx);
      await ctx.variableList.updateVariable(variable);
    }
  }

  /**
   * 
   * @param {Variable} variable 
   * @param {TxDetails} tx 
   */
  static _releaseRL(variable, tx) {
    variable.removeReadLock(tx.getId());
  }

  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {ResourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _releaseWL(ctx, variableName, txId) {
    let variable = await ctx.variableList.getVariable(variableName);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (variable && tx) {
      variable.setWriteLockHolder(null);

      await ctx.TxDetailsList.updateTxDetails(tx);
      await ctx.variableList.updateVariable(variable);
    }
  }


  /**
   * 
   * @param {ResourceManagerContext} ctx 
   * @param {string} variableName 
   * @returns {Promise<void>}
   */
  async _isWL(ctx, variableName) {
    let variable = await ctx.variableList.getVariable(variableName);

    if (variable) {
      return variable.getWriteLock() && variable.getWriteLock().length > 0;
    }

    return false;
  }

  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {ResourceManagerContext} ctx 
   * @param {LockType} lockType
   * @returns {Promise<void>}
   */
  async _canObtainLock(ctx, variableName, txId, lockType) {
    let variable = await ctx.variableList.getVariable(variableName);

    if (variable) {
      let readLocks = variable.getReadLocks();
      // The variable is read-locked and we want to set a write lock on it and we don't have an exclusive read lock on it.
      if (readLocks && readLocks.length > 0 && lockType == LockType.WRITE_LOCK && !(readLocks.length == 1 && readLocks.indexOf(txId) == 0)) {
        return false;
      }

      let writeLock = variable.getWriteLock();

      // The variable is write-locked and we don't own the lock
      if (writeLock && writeLock.length > 0 && writeLock != txId) {
        return false;
      }

    }

    return true;
  }

  /**
   * Locks a variable for reading or writing. If the variable does not exist, it is first created and then locked.
   * @param {string} variableName 
   * @param {string} txId 
   * @param {ResourceManagerContext} ctx 
   * @param {LockType} lockType
   * @returns {Promise<void>}
   */
  async _lock(ctx, variableName, txId, lockType) {
    let variable = await ctx.variableList.getVariable(variableName);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (!variable) {
      variable = Variable.createInstance(variableName, null);
    }

    let readLocks = variable.getReadLocks();
    let writeLock = variable.getWriteLock();

    if (lockType == LockType.READ_LOCK) {
      // we don't already have ANY lock, obtain it! Otherwise, do nothing (if we have any lock already, we don't need a read lock)!
      if (!(readLocks && readLocks.indexOf(txId) >= 0) && writeLock != txId) {
        ResourceManager._setRL(variable, tx);
      }

    } else {// WL is requested

      // if WL then it is already us (do nothing)!
      if (!(writeLock && writeLock.length > 0)) {
        // if RL then it is also us. Unlock it!
        if (readLocks && readLocks.length > 0) {
          ResourceManager._releaseRL(variable, tx);
        }

        ResourceManager._setWL(variable, tx);
      }
    }

    await ctx.variableList.updateVariable(variable);
    await ctx.TxDetailsList.updateTxDetails(tx);

    return variable;
  }

  /**
   * tries to acquire a read or write lock on a variable, and returns the variable if the lock
   * was successful. Otherwise, returns null.
   * @param {ResourceManagerContext} ctx 
   * @param {string} variableName 
   * @param {string} txId 
   * @param {LockType} lockType 
   * 
   * @returns {Promise<Variable>}
   */
  async _acquireLock(ctx, variableName, txId, lockType) {
    if (await this._canObtainLock(ctx, variableName, txId, lockType)) {
      let variable = await this._lock(ctx, variableName, txId, lockType);
      return variable;
    }
    return null;
  }


  /**
   *
   * @param {Variable} variable 
   * @param {TxDetails} tx 
   */
  static _setRL(variable, tx) {
    variable.addReadLock(tx.getId());;
  }

  /**
   *
   * @param {Variable} variable 
   * @param {TxDetails} tx 
   */
  static _setWL(variable, tx) {
    variable.setWriteLockHolder(tx.getId());
  }

  /**
   *
   * @param {string} txId 
   * @param {ResourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _requireSameOwner(ctx, txId) {
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (tx) {
      let owner = tx.getOwner();

      if (owner != ctx.clientIdentity.getID()) {
        throw new Error("Message sender is not owner of global transaction!");
      }
    } else {
      throw new Error("The global transaction does not exist!");
    }

  }

  /**
   *
   * @param {string} txId 
   * @param {ResourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _requireTxStarted(ctx, txId) {
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (!tx || tx.getState() != TxState.STARTED) {
      throw new Error("The global transaction is in invalid state! " + txId);
    }
  }

  /**
   * 
   * @param {ResourceManagerContext} ctx 
   * @param {string} txId 
   */
  async _getAllLockedVariables(ctx, txId) {
    return  (await ctx.variableList.getAllVariables()).filter(v => v.getWriteLock() === txId || v.getReadLocks().indexOf(txId) >= 0);
  }


  /**
   * Starts the execution of a new global transaction
   * @param {ResourceManagerContext} ctx 
   * @param {string} txId 
   */
  async begin(ctx, txId) {
    let oldTx = await ctx.TxDetailsList.getTxDetails(txId);

    if (oldTx != null) {
      throw new Error('The transaction with the id: ' + txId + ' already exists!');
    }


    let tx = TxDetails.createInstance(txId, ctx.clientIdentity.getID());
    await ctx.TxDetailsList.addTxDetails(tx);

    ctx.stub.setEvent('TransactionStarted',
      Buffer.from(JSON.stringify({
        "txId": txId
      })));

    console.info('**** transaction (id: ' + txId + ') started! ****');
  }

  /**
   * Commits a global transaction
   * @param {ResourceManagerContext} ctx 
   * @param {string} txId 
   */
  async commit(ctx, txId) {
    await this._requireSameOwner(ctx, txId);
    await this._requireTxStarted(ctx, txId);
    await this._releaseLocks(ctx, txId);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);
    tx.setState(TxState.COMMITTED);
    await ctx.TxDetailsList.updateTxDetails(tx);
    ctx.stub.setEvent('TransactionCommitted',
      Buffer.from(JSON.stringify({
        "txId": txId
      }))
    );
    console.info('**** transaction (id: ' + txId + ') committed! ****');
  }

  /**
   * Aborts a global transaction
   * @param {ResourceManagerContext} ctx 
   * @param {string} txId 
   */
  async abort(ctx, txId) {
    await this._requireSameOwner(ctx, txId);
    await this._requireTxStarted(ctx, txId);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);
    let variables = await this._getAllLockedVariables(ctx, txId);

    for (let variable of variables) {

      if (variable.getWriteLock() && variable.getWriteLock().length > 0) {
        variable.value = variable.beforeImage;
        variable.beforeImage = null;
        await ctx.variableList.updateVariable(variable);
      }
    }

    await this._releaseLocks(ctx, txId);
    tx.setState(TxState.ABORTED);
    await ctx.TxDetailsList.updateTxDetails(tx);

    ctx.stub.setEvent('TransactionAborted',
      Buffer.from(JSON.stringify({
        "txId": txId
      }))
    );
    console.info('**** transaction (id: ' + txId + ') aborted! ****');
  }

  /**
   * 
   * @param {ResourceManagerContext} ctx 
   * @param {string} txId 
   * @param {string} variableName 
   * @param {string} variableValue 
   */
  async setValue(ctx, txId, variableName, variableValue) {
    await this._requireTxStarted(ctx, txId);
    await this._requireSameOwner(ctx, txId);

    // this operation also ensures the variable exists.
    let variable = await this._acquireLock(ctx, variableName, txId, LockType.WRITE_LOCK);

    if (!variable) {
      throw new Error("Cannot lock the variable: '" + variableName + "' for writing!");
    }

    variable.beforeImage = variable.value;
    variable.value = variableValue;
    await ctx.variableList.updateVariable(variable);
  }

  async getValue(ctx, txId, variableName) {
    await this._requireTxStarted(ctx, txId);
    await this._requireSameOwner(ctx, txId);
    let variable = await this._acquireLock(ctx, variableName, txId, LockType.READ_LOCK);

    if (!variable) {
      throw new Error("Cannot lock the variable: '" + variableName + "' for reading!");
    }

    return variable.value;
  }


}

module.exports = ResourceManager;