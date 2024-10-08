/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const StateList = require('../ledger-api/statelist');
const TxDetails = require('./tx-details');

/**
 * Manages a collection of TxDetails
 */
class TxDetailsList extends StateList {
    constructor(ctx) {
        super(ctx, 'txdetailslist');
        this.cache = new Map();
    }

    /**
     *
     * @param {TxDetails} txDetails
     */
    async addTxDetails(txDetails) {
        await this.addState(txDetails);
        this.cache.set(txDetails.getId(), txDetails);
    }


    /**
     *
     * @param {TxDetails} txDetails
     */
    async updateTxDetails(txDetails) {
        await this.updateState(txDetails);
        this.cache.set(txDetails.getId(), txDetails);
    }

    /**
     *
     * @param {String} txId
     * @returns {Promise<TxDetails>}
     */
    async getTxDetails(txId) {
        if (this.cache.has(txId)) {
            return this.cache.get(txId);
        }

        let txKey = TxDetails.makeKey([txId]);
        let result = await this.getState(txKey);
        return result ? TxDetails.fromBuffer(result) : null;
    }

    /**
     *
     * @returns {Promise<Array<TxDetails>>}
     */
    async getAllTxDetails() {
        let txs = await this.getAll();
        return txs.map(tx => TxDetails.deserialize(tx));
    }


}

module.exports = TxDetailsList;