
'use strict';

// Utility class for collections of ledger states --  a state list
const StateList = require('../../ledger-api/statelist.js');
const TxDetails = require('./tx-details');

class TxDetailsList extends StateList {
    constructor(ctx) {
        super(ctx, "txdetailslist");
    }

    /**
     * 
     * @param {TxDetails} txDetails 
     */
    async addTxDetails(txDetails) {
        await this.addState(txDetails);
    }


    /**
     * 
     * @param {TxDetails} txDetails 
     */
    async updateTxDetails(txDetails) {
        await this.updateState(txDetails);
    }

    /**
     * 
     * @param {string} txId 
     * @returns {Promise<TxDetails>}
     */
    async getTxDetails(txId) {
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