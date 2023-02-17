
'use strict';

// Utility class for collections of ledger states --  a state list
const StateList = require('./../ledger-api/statelist.js');
const TxDetails = require('./tx-details');

class TxDetailsList extends StateList {
    constructor(ctx) {
        super(ctx, "txdetailslist");
    }

    async addTxDetails(txDetails) {
        return this.addState(txDetails);
    }

    /**
     * 
     * @param {String} txKey 
     * @returns {TxDetails}
     */
    async getTxDetails(txKey) {
        let result = await this.getState(txKey);

        return result? new TxDetails(result) : null;
    }

    async updateTxDetails(txDetails) {
        return this.updateState(txDetails);
    }
}

module.exports = TxDetailsList;