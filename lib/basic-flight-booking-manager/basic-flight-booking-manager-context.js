/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const ClientBalanceList = require('./client-balance-list');
const FlightList = require('./flight-list');
const BookingList = require('./booking-list');
const { Context } = require('fabric-contract-api');


class BasicFlightBookingManagerContext extends Context {
    constructor() {
        super();
        this.clientBalances = new ClientBalanceList(this);
        this.flights = new FlightList(this);
        this.bookingList = new BookingList(this);
    }
}


module.exports = BasicFlightBookingManagerContext;