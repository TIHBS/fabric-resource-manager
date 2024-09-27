/*
 * SPDX-License-Identifier: Apache-2.0
 */

const State = require("../../ledger-api/state.js");
const TxState = require('./tx-state.js');

class TxDetails extends State {

    constructor(obj) {
        super([obj.id]);
        Object.assign(this, obj);
    }


    /**
     * 
     * @returns {String}
     */
    getId() {
        return this.id;
    }


    /**
     * 
     * @returns {String}
     */
    getOwner() {
        return this.owner;
    }

    /**
     * 
     * @param {TxState} newState 
     */
    setState(newState) {
        this.state = newState;
    }

    /**
     * 
     * @returns {TxState}
     */
    getState() {
        return this.state;
    }

    /**
     *
     * @returns {DateTime}
     */
    getTimeout() {
        return this.timeout;
    }

    /**
     * 
     * @param {Buffer} buffer 
     * @returns {TxDetails}
     */
    static fromBuffer(buffer) {
        return this.deserialize(State.jsonFromBuffer(buffer));
    }


    /**
     * Deserialize a state data to txdetails
     * @param {JSON} data to form back into the object
     */
    static deserialize(data) {
        return new TxDetails(data);
    }

    /**
     * Factory method to create a txdetails object
     * @param {String} id
     * @param {String} owner
     * @param {DateTime} timeout
     */
    static createInstance(id, owner, timeout) {
        return new TxDetails({ id: id, owner: owner, state: TxState.STARTED, timeout: timeout });
    }
}

module.exports = TxDetails;