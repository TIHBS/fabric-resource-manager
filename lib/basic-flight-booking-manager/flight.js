/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const State = require('../../ledger-api/state');

class Flight extends State {

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
     * @param {String} newId 
     */
    setId(newId) {
        this.id = newId;
    }

    /**
     *
     * @returns {number}
     */
    getSeats() {
        return this.seats;
    }

    /**
     *
     * @param {number} newValue
     */
    setSeats(newValue) {
        this.seats = newValue;
    }

    /**
    *
    * @returns {number}
    */
    getSeatPrice() {
        return this.seatPrice;
    }

    /**
     * 
     * @param {number} newPrice 
     */
    setSeatPrice(newPrice) {
        this.seatPrice = newPrice;
    }


    /**
     *
     * @param {Buffer} buffer
     * @returns {Flight}
     */
    static fromBuffer(buffer) {
        return this.deserialize(State.jsonFromBuffer(buffer));
    }


    /**
     * Deserialize a state data to a variable object
     * @param {JSON} data to form back into the object
     */
    static deserialize(data) {
        return new Flight(data);
    }

    /**
     * Factory method to create a variable object
     *
     * @param {String} id
     * @param {number} seats
     * @param {number} price 
     */
    static createInstance(id, seats, price) {
        return new Flight({ id: id, seats: seats, seatPrice: price });
    }

}

module.exports = Flight;