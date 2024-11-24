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
        client = crypto.createHash('sha256')
            .update(client)
            .digest('hex');
        
        console.log("client=" + client);
        
        if (this.cache.has(client)) {
            return this.cache.get(client);
        }

        let key = ClientBalance.makeKey([client]);
        let result = await this.getState(key);

        return result ? ClientBalance.fromBuffer(result) : null;
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