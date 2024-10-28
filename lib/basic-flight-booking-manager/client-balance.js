/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const State = require('../../ledger-api/state');

class ClientBalance extends State {

    constructor(obj) {
        super([obj.client]);
        Object.assign(this, obj);
    }

    /**
     *
     * @returns {String}
     */
    getClient() {
        return this.client;
    }

    setClient(newClient) {
        this.client = newClient;
    }

    /**
     *
     * @returns {String}
     */
    getBalance() {
        return this.balance;
    }

    /**
     *
     * @param {String} newValue
     */
    setBalance(newValue) {
        this.balance = newValue;
    }


    /**
     *
     * @param {Buffer} buffer
     * @returns {ClientBalance}
     */
    static fromBuffer(buffer) {
        return this.deserialize(State.jsonFromBuffer(buffer));
    }


    /**
     * Deserialize a state data to a variable object
     * @param {JSON} data to form back into the object
     */
    static deserialize(data) {
        return new ClientBalance(data);
    }

    /**
     * Factory method to create a variable object
     *
     * @param {String} client
     * @param {String} balance
     */
    static createInstance(client, balance) {
        return new ClientBalance({ client: client, balance: balance });
    }

}

module.exports = ClientBalance;