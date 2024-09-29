/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ResourceManagerContext = require('./resource-manager-context');
const ResourceManager = require('./resourceManager');

class FlightBookingManager extends Contract {
    constructor() {
        super('FlightBookingManager');
    }

    createContext() {
        return new ResourceManagerContext();
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @returns {String}
     */
    static _formulateClientBalanceVarName(ctx) {
        let hash = FlightBookingManager._hash(ctx.clientIdentity.getID());
        let buffer = Buffer.from(hash.toString());
        return buffer.toString('base64') + '__balance';
    }

    static _hash(str) {
        return str.split('').reduce((prevHash, currVal) =>
            (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0);
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {number} amountToDeduct
     * @returns {Promise<void>}
     * @private
     */
    async _deductFromClientBalance(ctx, txId, amountToDeduct) {
        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);
        let balance = await this.queryClientBalance(ctx, txId);
        let newBalance = balance - amountToDeduct;

        if (newBalance < 0) {
            throw new Error('Cannot deduct the specified amount because it will make the balance negative.');
        }

        if (!await (new ResourceManager()).setValue(ctx, txId, variableName, newBalance.toString())) {
            throw new Error('Cannot update client balance!. Data item is locked by another transaction!');
        }
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {String} variableName
     * @param {String} defaultValue
     * @returns {Promise<String>}
     * @private
     */
    async _queryVariable(ctx, txId, variableName, defaultValue) {
        let response = await (new ResourceManager()).getValue(ctx, txId, variableName);

        if (!response.isSuccessful) {
            throw new Error('Cannot query ' + variableName + '. Variable locked by another transaction!');
        }

        if (!response.value) {
            return defaultValue;
        }

        return response.value;
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @returns {Promise<Boolean>}
     */
    async isASeatAvailable(ctx, txId) {
        let seatsCount = await this.querySeatsCount(ctx, txId);
        let reserved = await this.queryBookedSeatsCount(ctx, txId);

        return seatsCount > reserved;
    }

    async isSeatAvailable(ctx, txId, seatNumber) {
        let seatsCount = await this.querySeatsCount(ctx, txId);
        let reserved = await this.queryBookedSeatsCount(ctx, txId);

        return seatNumber >= reserved && seatNumber < seatsCount;
    }

    async queryNextAvailableSeat(ctx, txId) {
        let seatsCount = await this.querySeatsCount(ctx, txId);
        let reserved = await this.queryBookedSeatsCount(ctx, txId);

        if (seatsCount > reserved) {
            return reserved;
        }

        return -1;
    }

    async isSeatBookedByClient(ctx, txId, seatNumber) {
        let bookedSeats = await this.queryNextAvailableSeat(ctx, txId);
        if (seatNumber < bookedSeats) {
            let seatOwner = await this._queryVariable(ctx, txId, 'seatOwner_' + seatNumber, null);

            return seatOwner && seatOwner === ctx.clientIdentity.getID();
        }

        return false;
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @returns {Promise<Boolean>}
     */
    async hasReservation(ctx, txId) {
        let reservations = await this.queryBookedSeatsCount(ctx, txId);
        for (let i = 0; i < reservations; i++) {
            if (await this.isSeatBookedByClient(ctx, txId, i)) {
                return true;
            }
        }

        return false;
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @returns {Promise<number>}
     */
    async querySeatsCount(ctx, txId) {
        return +(await this._queryVariable(ctx, txId, 'seatCount', '10'));
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {number} newCount
     * @returns {Promise<void>}
     */
    async changeSeatCount(ctx, txId, newCount) {
        if (newCount < 0) {
            throw new Error('The new count must be a positive value!. Instead got: ' + newCount);
        }

        if (!await (new ResourceManager()).setValue(ctx, txId, 'seatCount', newCount.toString())) {
            throw new Error('Cannot change seatCount. Variable locked by another transaction!');
        }
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @returns {Promise<number>}
     */
    async queryBookedSeatsCount(ctx, txId) {
        return +(await this._queryVariable(ctx, txId, 'bookedSeats', '0'));
    }


    /**
     *
     * @param {ResourceManagerContext}  ctx
     * @param {String} txId
     * @param {String} newPrice
     * @returns {Promise<void>}
     */
    async changeSeatPrice(ctx, txId, newPrice) {
        if (!await (new ResourceManager()).setValue(ctx, txId, 'seatPrice', newPrice)) {
            throw new Error('Failed to change seat price. Data item is locked by another transaction!');
        }
    }

    /**
     *
     * @param {ResourceManagerContext}  ctx
     * @param {String} txId
     * @returns {Promise<number>}
     */
    async querySeatPrice(ctx, txId) {
        return +(await this._queryVariable(ctx, txId, 'seatCount', '500'));
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @returns {Promise<number>}
     */
    async queryClientBalance(ctx, txId) {
        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);

        return +(await this._queryVariable(ctx, txId, variableName, '0'));
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {number} amountToAdd
     * @returns {Promise<void>}
     */
    async addToClientBalance(ctx, txId, amountToAdd) {
        if (amountToAdd < 0) {
            throw new Error('The amount must be a positive value!. Instead got: ' + amountToAdd);
        }

        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);
        let balance = await this.queryClientBalance(ctx, txId);
        let newBalance = balance + +amountToAdd;

        if (!await (new ResourceManager()).setValue(ctx, txId, variableName, newBalance.toString())) {
            throw new Error('Cannot update client balance!. Data item is locked by another transaction!');
        }
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {number} seatNumber
     * @returns {Promise<void>}
     */
    async bookSeat(ctx, txId, seatNumber) {
        let isSeatAvailable = await this.isSeatAvailable(ctx, txId, seatNumber);

        if (isSeatAvailable) {
            let isSuccessful = await (new ResourceManager()).setValue(ctx, txId, 'seatOwner_' + seatNumber, ctx.clientIdentity.getID());

            if (!isSuccessful) {
                throw new Error('Cannot update seat ownership info. Data item is locked by another transaction!');
            }

            let ticketPrice = await this.querySeatPrice(ctx, txId);
            await this._deductFromClientBalance(ctx, txId, ticketPrice);

            if (!await (new ResourceManager()).setValue(ctx, txId, 'bookedSeats', (seatNumber + 1).toString())) {
                throw new Error('Failed to change booked seats count. Data item is locked by another transaction!');
            }


        } else {
            throw new Error('Cannot reserve the seat. It is already reserved!');
        }
    }


    async endFlight(ctx, txId) {
        let reservations = await this.queryBookedSeatsCount(ctx, txId);

        for (let i = 0; i < reservations - 1; i++) {
            if (!await (new ResourceManager()).setValue(ctx, txId, 'seatOwner_' + i, null)) {
                throw new Error('Cannot change seat status. Data item is locked by another transaction!');
            }
        }

        if (!await (new ResourceManager()).setValue(ctx, txId, 'bookedSeats', '0')) {
            throw new Error('Cannot change seat status. Data item is locked by another transaction!');
        }
    }
}

module.exports = FlightBookingManager;
