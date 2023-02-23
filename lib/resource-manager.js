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


class RespourceManagerContext extends Context {
  constructor() {
    super();
    this.variableList = new VariableList(this);
    this.TxDetailsList = new TxDetailsList(this);
  }
}



/**
 * This contract allows all milk supply chain's involved actors to log their operations in a persistent way
 */
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
   * @param {String} txKey 
   */
  async _releaseLocks(ctx, txId) {
    let txKey = TxDetails.makeKey([txId]);
    let tx = await ctx.TxDetailsList.getTxDetails(txKey);

    for (let name of tx.getLockedVariables()) {
      await this._releaseLock(ctx, name, txId);
    }

  }

  /**
   *
   * @param {string} variableName 
   * @param {string} txId 
   * @param {RespourceManagerContext} txId 
   * @returns {Promise<void>}
   */
  async _releaseLock(ctx, variableName, txId) {

  }


  /**
   * 
   * @param {RespourceManagerContext} ctx 
   * @param {string} variableName 
   */
  async _isRL(ctx, variableName) {
    let variable = await ctx.variableList.getVariable(variableName);
    variable.getKey
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
   * Starts the execution of a new transaction
   * @param {RespourceManagerContext} ctx 
   * @param {String} txId 
   */
  async begin(ctx, txId) {
    console.info('**** starting a transaction (id: ' + txId + ')... ****');
    
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
}

module.exports = ResourceManager;
