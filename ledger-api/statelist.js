/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

const State = require('./state');

/**
 * StateList provides a named virtual container for a set of ledger states.
 * Each state has a unique key which associates it with the container, rather
 * than the container containing a link to the state. This minimizes collisions
 * for parallel transactions on different states.
 */
class StateList {

    /**
     * Store Fabric context for subsequent API access, and name of list
     * @param {Context} ctx
     * @param {string} listName
     */
    constructor(ctx, listName) {
        this.ctx = ctx;
        this.name = listName;
    }

    /**
     * Add a state to the list. Creates a new state in worldstate with
     * appropriate composite key.  Note that state defines its own key.
     * State object is serialized before writing.
     * @param {State} state
     * @returns
     */
    async addState(state) {
        let key = this.ctx.stub.createCompositeKey(this.name, state.getSplitKey());
        let data = State.serialize(state);

        await this.ctx.stub.putState(key, data);
    }

    /**
     * Get a state from the list using supplied keys. Form composite
     * keys to retrieve state from world state. State data is deserialized
     * into JSON object before being returned.
     */
    async getState(key) {

        let ledgerKey = this.ctx.stub.createCompositeKey(this.name, State.splitKey(key));
        return await this._getState(ledgerKey);
    }

    async _getState(ledgerKey) {
        let data = await this.ctx.stub.getState(ledgerKey);

        if (data && Object.keys(data).length > 0) {
            return data;
        } else {
            return null;
        }
    }

    /**
     * Update a state in the list. Puts the new state in world state with
     * appropriate composite key.  Note that state defines its own key.
     * A state is serialized before writing. Logic is very similar to
     * addState() but kept separate becuase it is semantically distinct.
     */
    async updateState(state) {
        await this.addState(state);
    }

    async deleteState(key) {
        let ledgerKey = this.ctx.stub.createCompositeKey(this.name, State.splitKey(key));
        await this.ctx.stub.deleteState(ledgerKey);
    }

    /**
     *
     * @returns {Promise<Array<State>>}
     */
    async getAll() {
        let iterator = await this.ctx.stub.getStateByPartialCompositeKey(this.name, []);
        return await this._getAllResults(iterator);
    }


    async _getAllResults(iterator) {
        const allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value) {
                // if not a getHistoryForKey iterator then key is contained in res.value.key
                allResults.push(State.jsonFromBuffer(res.value.value));
            }

            res = await iterator.next();
        }

        if (iterator.close) {
            iterator.close();
        }

        return allResults;
    }

}

module.exports = StateList;