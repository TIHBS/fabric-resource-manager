/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const crypto = require('crypto');
const StateList = require('../../ledger-api/statelist');
const ClientBalance = require('./client-balance');

/**
 * Manages a collection of client balances
 */
class ClientBalanceList extends StateList {
    constructor(ctx) {
        super(ctx, 'clientbalancelist');
        this.cache = new Map();
    }

    /**
     *
     * @param {ClientBalance} element
     *
     * @returns {Promise<void>}
     */
    async addElement(element) {
        await this.addState(element);
        this.cache.set(element.getClient(), element);
    }

    /**
     *
     * @param {ClientBalance} clientBalance
     * @returns {Promise<void>}
     */
    async updateClientBalance(clientBalance) {
        await this.updateState(clientBalance);
        this.cache.set(clientBalance.getClient(), clientBalance);
    }

    /**
     *
     * @param {String} client
     * @returns {Promise<ClientBalance>}
     */
    async getClientBalance(client) {
        const clientHash = crypto.createHash('sha256')
            .update(client)
            .digest('hex');
        
        console.log("client=" + clientHash);
        
        if (this.cache.has(clientHash)) {
            console.log("getting client balance from cache");
            return this.cache.get(clientHash);
        }

        let key = ClientBalance.makeKey([clientHash]);
        let result = await this.getState(key);

        if (!result) {
            result = ClientBalance.createInstance(client, 2000);
            this.cache.set(result.getClient(), result);
        } else {
            result = ClientBalance.fromBuffer(result);
        }

        return result;
    }

    /**
     *
     * @returns {Promise<Array<ClientBalance>>}
     */
    async getAllClientBalances() {
        let clientbalances = await this.getAll();
        return clientbalances.map(v => ClientBalance.deserialize(v));
    }
}

module.exports = ClientBalanceList;