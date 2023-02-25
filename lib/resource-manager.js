/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Context, Contract } = require('fabric-contract-api');
const Variable = require('./variable.js');
const VariableList = require('./variable-list.js');
const TxDetails = require('./tx-details.js');
const TxDetailsList = require('./tx-details-list.js');
const TxState = require('./tx-state.js');
const LockType = require('./lock-type.js');


class RespourceManagerContext extends Context {
  constructor() {
    super();
    this.variableList = new VariableList(this);
    this.TxDetailsList = new TxDetailsList(this);
  }
}



class ResourceManager extends Contract {

  constructor() {
    super("de.uni.stuttgart.iaas.blockchain.resorcemanager");
  }

  createContext() {
    return new RespourceManagerContext();
  }

  async instantiate(ctx) {
    console.log('Instantiate the contract');
  }

  /**
   * 
   * @param {RespourceManagerContext} ctx 
   * @param {string} txKey 
   */
  async _releaseLocks(ctx, txId) {
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    for (let name of tx.getLockedVariables()) {
      await this._releaseLock(ctx, name, txId);
    }

  }

  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {RespourceManagerContext} ctx 
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
   * @param {RespourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _releaseRL(ctx, variableName, txId) {
    let variable = await ctx.variableList.getVariable(variableName);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (variable && tx) {
      variable.removeReadLock(txId);
      tx.removeVariableLock(variableName);

      await ctx.TxDetailsList.updateTxDetails(tx);
      await ctx.variableList.updateVariable(variable);
    }
  }

  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {RespourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _releaseWL(ctx, variableName, txId) {
    let variable = await ctx.variableList.getVariable(variableName);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (variable && tx) {
      variable.setWriteLockHolder(null);
      tx.removeVariableLock(variableName);

      await ctx.TxDetailsList.updateTxDetails(tx);
      await ctx.variableList.updateVariable(variable);
    }
  }


  /**
   * 
   * @param {RespourceManagerContext} ctx 
   * @param {string} variableName 
   * @returns {Promise<void>}
   */
  async _isRL(ctx, variableName) {
    let variable = await ctx.variableList.getVariable(variableName);

    if (variable) {
      return variable.getReadLocks().length > 0;
    }

    return false;
  }

  /**
   * 
   * @param {RespourceManagerContext} ctx 
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
   * @param {RespourceManagerContext} ctx 
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
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {RespourceManagerContext} ctx 
   * @param {LockType} lockType
   * @returns {Promise<void>}
   */
  async _lock(ctx, variableName, txId, lockType) {
    let variable = await ctx.variableList.getVariable(variableName);

    if (variable) {
      let readLocks = variable.getReadLocks();
      let writeLock = variable.getWriteLock();

      if (lockType == LockType.READ_LOCK) {
        // we don't already have ANY lock, obtain it! Otherwise, do nothing (if we have any lock already, we don't need a read lock)!
        if (!(readLocks && readLocks.indexOf(txId) < 0) && !(writeLock && writeLock != txId)) {
          await this._setRL(ctx, variableName, txId);
        }

      } else {// WL is requested

        // if WL then it is already us (do nothing)!
        if (!(writeLock && writeLock.length > 0)) {
          // if RL then it is also us. Unlock it!
          if (readLocks && readLocks.length > 0) {
            await this._releaseRL(ctx, variableName, txId);
          }

          await this._setWL(ctx, variableName, txId);
        }
      }
    }
  }


  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {RespourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _setRL(ctx, variableName, txId) {
    let variable = await ctx.variableList.getVariable(variableName);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (variable && tx) {
      variable.addReadLock(txId);
      tx.addReadLock(variableName);

      await ctx.TxDetailsList.updateTxDetails(tx);
      await ctx.variableList.updateVariable(variable);
    }
  }

  /**
  *
  * @param {string} variableName 
  * @param {string} txId 
  * @param {RespourceManagerContext} ctx 
  * @returns {Promise<void>}
  */
  async _setWL(ctx, variableName, txId) {
    let variable = await ctx.variableList.getVariable(variableName);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (variable && tx) {
      variable.setWriteLockHolder(txId);
      tx.setWriteLockHolder(variableName);

      await ctx.TxDetailsList.updateTxDetails(tx);
      await ctx.variableList.updateVariable(variable);
    }
  }

  /**
   *
   * @param {string} txId 
   * @param {RespourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _requireSameOwner(ctx, txId) {
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (!tx || tx.getOwner().getID() != ctx.clientIdentity.getID()) {
      throw new rror("Message sender is not owner of global transaction!");
    }

  }

  /**
   *
   * @param {string} txId 
   * @param {RespourceManagerContext} ctx 
   * @returns {Promise<void>}
   */
  async _requireTxStarted(ctx, txId) {
    let tx = await ctx.TxDetailsList.getTxDetails(txId);

    if (!tx || tx.getState() != TxState.STARTED) {
      throw new Error("The global transaction is in invalid state!");
    }
  }

  /**
   * 
   * @param {RespourceManagerContext} ctx 
   */
  async getTxs(ctx, txId) {
    let txKey = TxDetails.makeKey([txId]);
    return ctx.TxDetailsList.getTxDetails(txKey);
  }

  /**
   * 
   * @param {RespourceManagerContext} ctx 
   */
  async getAllTxs(ctx) {
    return ctx.TxDetailsList.getAllTxDetails();
  }

  /**
   * Starts the execution of a new global transaction
   * @param {RespourceManagerContext} ctx 
   * @param {string} txId 
   */
  async begin(ctx, txId) {
    let oldTx = await ctx.TxDetailsList.getTxDetails(txId);

    if (oldTx != null) {
      throw new Error('The transaction with the id: ' + txId + ' is already started!');
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
   * @param {RespourceManagerContext} ctx 
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
   * @param {RespourceManagerContext} ctx 
   * @param {string} txId 
   */
  async abort(ctx, txId) {
    await this._requireSameOwner(ctx, txId);
    await this._requireTxStarted(ctx, txId);
    let tx = await ctx.TxDetailsList.getTxDetails(txId);
    let variableNames = tx.getLockedVariables();

    for (let name of variableNames) {
      let variable = await ctx.variableList.getVariable(name);

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

  
}



module.exports = ResourceManager;
