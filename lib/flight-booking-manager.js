/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ResourceManagerContext = require('./resource-manager-context');
const ResourceManager = require('./resourceManager');

class FlightBookingManager extends Contract {
    // variables:
    // hash(user)__balance
    // seatOwner_<#>
    // seatCount
    // bookedSeats
    // seatPrice
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
     * @param {String} tm
     * @returns {Promise<void>}
     * @private
     */
    async _deductFromClientBalance(ctx, txId, amountToDeduct, tm) {
        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);
        let balance = await this.queryClientBalance(ctx, txId, tm);
        let newBalance = balance - amountToDeduct;

        if (newBalance < 0) {
            throw new Error('Cannot deduct the specified amount because it will make the balance negative.');
        }

        if (!await (new ResourceManager()).setValue(ctx, txId, variableName, newBalance.toString(), tm)) {
            throw new Error('Cannot update client balance!. Data item is locked by another transaction!');
        }
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {String} variableName
     * @param {String} defaultValue
     * @param {String} tm
     * @returns {Promise<String>}
     * @private
     */
    async _queryVariable(ctx, txId, variableName, defaultValue, tm) {
        let response = await (new ResourceManager()).getValue(ctx, txId, variableName, tm);

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
     * @param {String} tm
     * @returns {Promise<Boolean>}
     */
    async isASeatAvailable(ctx, txId, tm) {
        let seatsCount = await this.querySeatsCount(ctx, txId, tm);
        let reserved = await this.queryBookedSeatsCount(ctx, txId, tm);

        return seatsCount > reserved;
    }

    async isSeatAvailable(ctx, txId, tm, seatNumber) {
        let seatsCount = await this.querySeatsCount(ctx, txId, tm);
        let reserved = await this.queryBookedSeatsCount(ctx, txId, tm);

        return seatNumber >= reserved && seatNumber < seatsCount;
    }

    async queryNextAvailableSeat(ctx, txId, tm) {
        let seatsCount = await this.querySeatsCount(ctx, txId, tm);
        let reserved = await this.queryBookedSeatsCount(ctx, txId, tm);

        if (seatsCount > reserved) {
            return reserved;
        }

        return -1;
    }

    async isSeatBookedByClient(ctx, txId, tm, seatNumber) {
        let seatOwner = await this._queryVariable(ctx, txId, 'seatOwner_' + seatNumber, null, tm);

        return seatOwner !== null && seatNumber !== undefined && seatOwner === ctx.clientIdentity.getID();
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @returns {Promise<Boolean>}
     */
    async hasReservation(ctx, txId, tm) {
        let reservations = await this.queryBookedSeatsCount(ctx, txId, tm);
        for (let i = 0; i < reservations; i++) {
            if (await this.isSeatBookedByClient(ctx, txId, tm, i)) {
                return true;
            }
        }

        return false;
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {String} tm
     * @returns {Promise<number>}
     */
    async querySeatsCount(ctx, txId, tm) {
        return +(await this._queryVariable(ctx, txId, 'seatCount', '10', tm));
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {number} newCount
     * @param {String} tm
     * @returns {Promise<void>}
     */
    async changeSeatCount(ctx, txId, tm, newCount) {
        if (newCount < 0) {
            throw new Error('The new count must be a positive value!. Instead got: ' + newCount);
        }

        if (!await (new ResourceManager()).setValue(ctx, txId, 'seatCount', newCount.toString(), tm)) {
            throw new Error('Cannot change seatCount. Variable locked by another transaction!');
        }
    }

    /**
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {String} tm
     * @returns {Promise<number>}
     */
    async queryBookedSeatsCount(ctx, txId, tm) {
        let bookedSeatsString = (await this._queryVariable(ctx, txId, 'bookedSeats', '', tm));

        if (bookedSeatsString === '') {
            return 0;
        }

        return bookedSeatsString.split(':').length;
    }


    /**
     * @param {ResourceManagerContext}  ctx
     * @param {String} txId
     * @param {String} newPrice
     * @param {String} tm
     * @returns {Promise<void>}
     */
    async changeSeatPrice(ctx, txId, tm, newPrice) {
        if (!await (new ResourceManager()).setValue(ctx, txId, 'seatPrice', newPrice, tm)) {
            throw new Error('Failed to change seat price. Data item is locked by another transaction!');
        }
    }

    /**
     * @param {ResourceManagerContext}  ctx
     * @param {String} txId
     * @param {String} tm
     * @returns {Promise<number>}
     */
    async querySeatPrice(ctx, txId, tm) {
        return +(await this._queryVariable(ctx, txId, 'seatPrice', '500', tm));
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {String} tm
     * @returns {Promise<number>}
     */
    async queryClientBalance(ctx, txId, tm) {
        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);

        return +(await this._queryVariable(ctx, txId, variableName, '0', tm));
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {number} amountToAdd
     * @param {String} tm
     * @returns {Promise<void>}
     */
    async addToClientBalance(ctx, txId, tm, amountToAdd) {
        if (amountToAdd < 0) {
            throw new Error('The amount must be a positive value!. Instead got: ' + amountToAdd);
        }

        let variableName = FlightBookingManager._formulateClientBalanceVarName(ctx);
        let balance = await this.queryClientBalance(ctx, txId, tm);
        let newBalance = balance + +amountToAdd;

        if (!await (new ResourceManager()).setValue(ctx, txId, variableName, newBalance.toString(), tm)) {
            throw new Error('Cannot update client balance!. Data item is locked by another transaction!');
        }
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {number} seatNumber
     * @param {String} tm
     * @returns {Promise<void>}
     */
    async bookSeat(ctx, txId, tm, seatNumber) {
        let isSeatAvailable = await this.isSeatAvailable(ctx, txId, tm, seatNumber);

        if (isSeatAvailable) {
            let isSuccessful = await (new ResourceManager()).setValue(ctx, txId, 'seatOwner_' + seatNumber, ctx.clientIdentity.getID(), tm);

            if (!isSuccessful) {
                throw new Error('Cannot update seat ownership info. Data item is locked by another transaction!');
            }

            let ticketPrice = await this.querySeatPrice(ctx, txId, tm);
            await this._deductFromClientBalance(ctx, txId, ticketPrice, tm);

            let bookedSeatsString = (await this._queryVariable(ctx, txId, 'bookedSeats', '', tm));

            if (bookedSeatsString === '') {
                bookedSeatsString = seatNumber.toString();
            } else {
                bookedSeatsString = bookedSeatsString + '_' + seatNumber.toString();
            }

            if (!await (new ResourceManager()).setValue(ctx, txId, 'bookedSeats', bookedSeatsString, tm)) {
                throw new Error('Failed to change booked seats count. Data item is locked by another transaction!');
            }
        } else {
            throw new Error('Cannot reserve the seat. It is already reserved!');
        }
    }

    async endFlight(ctx, txId, tm) {
        let reservations = await this.queryBookedSeatsCount(ctx, txId, tm);

        for (let i = 0; i < reservations; i++) {
            if (!await (new ResourceManager()).setValue(ctx, txId, 'seatOwner_' + i, null, tm)) {
                throw new Error('Cannot change seat status. Data item is locked by another transaction!');
            }
        }

        if (!await (new ResourceManager()).setValue(ctx, txId, 'bookedSeats', '', tm)) {
            throw new Error('Cannot change seat status. Data item is locked by another transaction!');
        }
    }
}

module.exports = FlightBookingManager;