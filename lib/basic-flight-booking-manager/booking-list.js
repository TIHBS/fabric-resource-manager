/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const StateList = require('../../ledger-api/statelist');
const Booking = require('./booking');

/**
 * Manages a collection of bookings
 */
class BookingList extends StateList {
    constructor(ctx) {
        super(ctx, 'bookinglist');
        this.cache = new Map();
    }

    /**
     *
     * @param {Booking} element
     *
     * @returns {Promise<void>}
     */
    async addBooking(element) {
        await this.addState(element);
        this.cache.set(element.getId(), element);
    }

    /**
     *
     * @param {Booking} booking
     * @returns {Promise<void>}
     */
    async updateBooking(booking) {
        await this.updateState(booking);
        this.cache.set(booking.getId(), booking);
    }

    /**
     *
     * @param {String} clientId
     * @param {String} flightId 
     * @returns {Promise<Booking>}
     */
    async getBooking(clientId, flightId) {
        let key = Booking.makeKey([clientId, flightId]);
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        let result = await this.getState(key);

        return result ? Booking.fromBuffer(result) : null;
    }

    /**
     *
     * @returns {Promise<Array<Booking>>}
     */
    async getAllBookings() {
        let bookings = await this.getAll();
        return bookings.map(v => Booking.deserialize(v));
    }
}

module.exports = BookingList;