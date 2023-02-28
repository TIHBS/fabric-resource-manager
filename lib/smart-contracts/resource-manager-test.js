/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const ResourceManagerContext = require('../resource-manager/resource-manager-context.js');
const ResourceManager = require('../resource-manager/resource-manager.js');

class ResourceManagerTest extends Contract {
    constructor() {
        super("resorcemanagertest");
    }

    createContext() {
        return new ResourceManagerContext();
    }

    /**
    * For testing purposes
    * @param {ResourceManagerContext} ctx 
    */
    async begin(ctx, txid) {
        let manager = new ResourceManager();
        await manager.begin(ctx, txid);
    }

    /**
     * 
     * @param {ResourceManagerContext} ctx 
     */
    async setValues(ctx, txid, willSucceed) {
        let mananger = new ResourceManager();
        try {
            await mananger.setValue(ctx, txid, "VAR-A", "hello");
            await mananger.setValue(ctx, txid, "VAR-B", "bye bye");

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
        let mananger = new ResourceManager();
        let value = null;
        try {
            value = await mananger.getValue(ctx, txid, "VAR-A");

            if (willSucceed == false) {
                throw new Error("reading the values was successful although it was expected to fail!");
            }
        } catch (e) {
            if (willSucceed == true) {
                throw new Error("reading the values failed although it was expected to succeed!");
            }

            return;
        }


        if (value !== "hello") {
            throw new Error("VAR-A contains an unexpected value!");
        }
        value = await mananger.getValue(ctx, txid, "VAR-B");

        if (value !== "bye bye") {
            throw new Error("VAR-B contains an unexpected value!");
        }

        let lockedVariables = await mananger._getAllLockedVariables(ctx, txid);

        if (lockedVariables.length != expectedLocks) {
            throw new Error("incorrect number of variables locked! expected is " + expectedLocks + ". Found: " + lockedVariables.length);
        }
    }

    async commit(ctx, txid) {
        let manager = new ResourceManager();
        await manager.commit(ctx, txid);
    }

    async postCommit(ctx, txid) {
        let lockedVariables = await (new ResourceManager())._getAllLockedVariables(ctx, txid);

        if (lockedVariables.length != 0) {
            throw new Error("incorrect number of variables locked! expected is 0. Found: " + lockedVariables.length);
        }
    }

    async abort(ctx, txid) {
        await (new ResourceManager()).abort(ctx, txid);
    }
}


module.exports = ResourceManagerTest;