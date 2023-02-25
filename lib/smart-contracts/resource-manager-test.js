/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const ResourceManagerContext = require('../resource-manager-context.js');
const ResourceManager = require('../resource-manager.js');

class ResourceManagerTest extends ResourceManager {
    constructor() {
        super("de.uni.stuttgart.iaas.blockchain.resorcemanagertest");
    }

    /**
    * 
    * @param {ResourceManagerContext} ctx 
    */
    async begin(ctx, txid) {
        await super.begin(ctx, txid);
    }
    /**
     * 
     * @param {ResourceManagerContext} ctx 
     */
    async setValues(ctx, txid, willSucceed) {
        try {
            await this.setValue(ctx, txid, "VAR-A", "hello");
            await this.setValue(ctx, txid, "VAR-B", "bye bye");

        } catch (e) {
            if (willSucceed == true) {
                throw new Error("setting the values failed although it was expected to succeed!");
            }
        }

        if (willSucceed == false) {
            throw new Error("setting the values was successful although it was expected to fail!");
        }

    }
    /**
     * 
     * @param {ResourceManagerContext} ctx 
     */
    async readValues(ctx, txid, expectedLocks, willSucceed) {
        let value = null;
        try {
            value = await this.getValue(ctx, txid, "VAR-A");

            if(willSucceed == false) {
                throw new Error("reading the values was successful although it was expected to fail!");
            }
        } catch (e) {
            if(willSucceed == true) {
                throw new Error("reading the values failed although it was expected to succeed!");
            }

            return;
        }


        if (value !== "hello") {
            throw new Error("VAR-A contains an unexpected value!");
        }
        value = await this.getValue(ctx, txid, "VAR-B");

        if (value !== "bye bye") {
            throw new Error("VAR-B contains an unexpected value!");
        }

        let lockedVariables = await super._getAllLockedVariables(ctx, txid);

        if (lockedVariables.length != expectedLocks) {
            throw new Error("incorrect number of variables locked! expected is " + expectedLocks + ". Found: " + lockedVariables.length);
        }



    }

    async commit(ctx, txid) {
        await super.commit(ctx, txid);
    }

    async postCommit(ctx, txid) {
        let lockedVariables = await super._getAllLockedVariables(ctx, txid);

        if (lockedVariables.length != 0) {
            throw new Error("incorrect number of variables locked! expected is 0. Found: " + lockedVariables.length);
        }
    }

    async abort(ctx, txid) {
        await super.abort(ctx, txid);
    }
}


module.exports = ResourceManagerTest;