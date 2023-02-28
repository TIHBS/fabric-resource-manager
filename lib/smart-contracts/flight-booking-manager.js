/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const ResourceManagerContext = require('../resource-manager/resource-manager-context.js');
const ResourceManager = require('../resource-manager/resource-manager.js');

class FlightBookingManager extends Contract {
    constructor() {
        super("FlightBookingManager");
    }

    createContext() {
        return new ResourceManagerContext();
    }

    /**
     * For testing purposes
     * @param {ResourceManagerContext} ctx 
     * @param {string} txid 
     */
    async begin(ctx, txid) {
        await (new ResourceManager()).begin(ctx, txid);
    }

    /**
     * For testing purposes
     * @param {ResourceManagerContext} ctx 
     * @param {string} txid 
     */
    async commit(ctx, txid) {
        await (new ResourceManager()).commit(ctx, txid);
    }
    
    /**
     * For testing purposes
     * @param {ResourceManagerContext} ctx 
     * @param {string} txid 
     */
    async abort(ctx, txid) {
        await (new ResourceManager()).abort(ctx, txid);
    }

    /**
     * 
     * @param {ResourceManagerContext} ctx 
     * @param {string} txId 
     * @returns {Promise<boolean>}
     */
    async isSeatAvailable(ctx, txId) {
        let seatOwner = await (new ResourceManager()).getValue(ctx, txId, "seatOwner");

        if (seatOwner == null) {
            return true;
        }

        return false;
    }

    async changeSeatPrice(ctx, txId, newPrice) {
        await (new ResourceManager()).setValue(ctx, txId, "seatPrice", newPrice);
    }

    async querySeatPrice(ctx, txId) {
        let defaultPrice = 500;
        let price = await (new ResourceManager()).getValue(ctx, txId, "seatPrice");

        if (!price) {
            price = defaultPrice;
        } else {
            price = +price;
        }

        return price;
    }

    /**
     * 
     * @param {ResourceManagerContext} ctx 
     * @param {string} txId 
     * @returns {Promise<boolean>}
     */
    async queryClientBalance(ctx, txId) {
        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);
        let balance = await (new ResourceManager()).getValue(ctx, txId, variableName);

        if (!balance) {
            return 0;
        }

        return +balance;
    }

    /**
     * 
     * @param {ResourceManagerContext} ctx 
     * @param {string} txId 
     * @param {number} amountToAdd 
     * @returns {Promise<void>}
     */
    async addToClientBalance(ctx, txId, amountToAdd) {
        if (amountToAdd < 0) {
            throw new Error("The amount must be a positive value!. Instead got: " + amountToAdd);
        }

        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);
        let balance = await this.queryClientBalance(ctx, txId);
        let newBalance = +balance + +amountToAdd;
        await (new ResourceManager()).setValue(ctx, txId, variableName, newBalance);
    }

    async _deductFromClientBalance(ctx, txId, amountToDeduct) {
        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);
        let balance = await this.queryClientBalance(ctx, txId);
        let newBalance = balance - amountToDeduct;

        if (newBalance < 0) {
            throw new Error("Cannot deduct the specified amount because it will make the balance negative.");
        }

        await (new ResourceManager()).setValue(ctx, txId, variableName, newBalance);
    }


    /**
     * 
     * @param {ResourceManagerContext} ctx 
     * @param {string} txId 
     * @returns {Promise<void>}
     */
    async bookSeat(ctx, txId) {
        let isSeatAvailable = await this.isSeatAvailable(ctx, txId);

        if (isSeatAvailable == true) {
            await (new ResourceManager()).setValue(ctx, txId, "seatOwner", ctx.clientIdentity.getID());
            let ticketPrice = await this.querySeatPrice(ctx, txId);
            await this._deductFromClientBalance(ctx, txId, ticketPrice);
        } else {
            throw new Error("Cannot reserve the seat. It is already reserved!");
        }
    }

    /**
 * 
 * @param {ResourceManagerContext} ctx 
 * @param {string} txId 
 * @returns {Promise<void>}
 */
    async hasReservation(ctx, txId) {
        let owner = await (new ResourceManager()).getValue(ctx, txId, "seatOwner");

        return owner && owner == ctx.clientIdentity.getID();
    }

    async endFlight(ctx, txId) {
        await (new ResourceManager()).setValue(ctx, txId, "seatOwner", null);
    }


    /**
     * 
     * @param {ResourceManagerContext} ctx 
     * @returns {string}
     */
    static _formulateClientBalanceVarName(ctx) {
        let hash = FlightBookingManager._hash(ctx.clientIdentity.getID());
        let buffer = Buffer.from(hash.toString());
        return buffer.toString('base64') + "__balance";
    }

    static _hash(str) {
        return str.split('').reduce((prevHash, currVal) =>
            (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0);
    }

}

module.exports = FlightBookingManager;