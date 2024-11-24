/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const StateList = require('../../ledger-api/statelist');
const Flight = require('./flight');

/**
 * Manages a collection of flights
 */
class FlightList extends StateList {
    constructor(ctx) {
        super(ctx, 'flightlist');
        this.cache = new Map();
    }

    /**
     *
     * @param {Flight} element
     *
     * @returns {Promise<void>}
     */
    async addFlight(element) {
        console.debug("adding flight with id: " + element.getId());
        await this.addState(element);
        this.cache.set(element.getId(), element);
    }

    /**
     *
     * @param {Flight} flight
     * @returns {Promise<void>}
     */
    async updateFlight(flight) {
        await this.updateState(flight);
        this.cache.set(flight.getId(), flight);
    }

    /**
     *
     * @param {String} id
     * @returns {Promise<Flight>}
     */
    async getFlight(id) {
        console.debug("getFlight(" + id + ")");
        
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        let key = Flight.makeKey([id]);
        let result = await this.getState(key);
        console.debug("get Flight result = " + result ? Flight.fromBuffer(result) : "null");

        return result ? Flight.fromBuffer(result) : null;
    }

    /**
     *
     * @returns {Promise<Array<Flight>>}
     */
    async getAllFlights() {
        let flights = await this.getAll();
        return flights.map(v => Flight.deserialize(v));
    }
}

module.exports = FlightList;