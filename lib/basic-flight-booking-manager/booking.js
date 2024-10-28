/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const State = require('../../ledger-api/state');

class Booking extends State {

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
    getClientId() {
        return this.clientId;
    }


    /**
     *
     * @returns {String}
     */
    getFlightId() {
        return this.flightId;
    }

    /**
     *
     * @returns {number}
     */
    getSeatNumber() {
        return this.seatNumber;
    }

    /**
     *
     * @param {Buffer} buffer
     * @returns {Booking}
     */
    static fromBuffer(buffer) {
        return this.deserialize(State.jsonFromBuffer(buffer));
    }

    /**
     * Deserialize a state data to a variable object
     * @param {JSON} data to form back into the object
     */
    static deserialize(data) {
        return new Booking(data);
    }

    /**
     * Factory method to create a booking object
     *
     * @param {String} clientId 
     * @param {String} flightId 
     * @param {number} seatNumber 
     */
    static createInstance(clientId, flightId, seatNumber) {
        return new Booking({ id: Booking.makeKey([clientId, flightId]), clientId: clientId, flightId: flightId, seatNumber: seatNumber});
    }

}

module.exports = Booking;