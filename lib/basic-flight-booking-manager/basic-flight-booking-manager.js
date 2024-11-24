/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const BasicFlightBookingManagerContext = require('./basic-flight-booking-manager-context');
const ClientBalance = require('./client-balance');
const Flight = require('./flight');
const { _formulateClientBalanceVarName } = require('../flight-booking-manager');
const Booking = require('./booking');

class BasicFlightBookingManager extends Contract {
    constructor() {
        super('BasicFlightBookingManager');
    }

    createContext() {
        return new BasicFlightBookingManagerContext();
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     */
    async InitLedger(ctx) {
        await addToClientBalance(ctx, 2000);
        await createFlight(ctx, "FLY-1", 200, 500);
    }

    /**
     *
     * @param {BasicFlightBookingManagerContext} ctx
     * @param {number} amountToDeduct
     * @returns {Promise<void>}
     * @private
     */
    async _deductFromClientBalance(ctx, amountToDeduct) {
        let client = ctx.clientIdentity.getID();
        let clientBalance = await ctx.clientBalances.getClientBalance(client);
        let newBalance = clientBalance.balance - amountToDeduct;

        if (newBalance < 0) {
            throw new Error('Cannot deduct the specified amount because it will make the balance negative.');
        }

        clientBalance.balance = newBalance;

        await ctx.clientBalances.updateClientBalance(clientBalance);
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId 
     * @param {number} numSeats 
     * @param {number} seatPrice 
     */
    async createFlight(ctx, flightId, numSeats, seatPrice) {
        let flight = Flight.createInstance(flightId, numSeats, seatPrice);
        await ctx.flights.addFlight(flight);
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId 
     * @param {number} seatNumber 
     */
    async isSeatAvailable(ctx, flightId, seatNumber) {
        let all = await ctx.bookingList.getAllBookings();

        if (all) {
            let filtered = all.filter(booking => booking.getFlightId() === flightId && booking.getSeatNumber() === seatNumber);

            return filtered.length === 0;
        }

        return true;
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId 
     */
    async isASeatAvailable(ctx, flightId) {
        let seatCount = await this.querySeatsCount(ctx, flightId);
        let bookedSeats = await this.queryBookedSeatsCount(ctx, flightId);

        return seatCount > bookedSeats;
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId
     * @returns {number} 
     */
    async queryNextAvailableSeat(ctx, flightId) {
        let seats = await this.querySeatsCount(ctx, flightId);

        for(let i = 1; i <= seats; i++) {
            if(this.isSeatAvailable(ctx, flightId, i)) {
                return i;
            }
        }

        return -1;
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId 
     * @param {number} seatNumber 
     */
    async isSeatBookedByClient(ctx, flightId, seatNumber) {
        let clientId = ctx.clientIdentity.getID();
        let booking = await ctx.bookingList.getBooking(clientId, flightId);        
        return booking && booking.getSeatNumber() === seatNumber;
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId 
     */
    async hasReservation(ctx, flightId) {
        let clientId = ctx.clientIdentity.getID();
        let booking = await ctx.bookingList.getBooking(clientId, flightId);

        return booking != null && booking != undefined;
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     */
    async queryClientBalance(ctx) {
        let client = ctx.clientIdentity.getID();
        let clientBalance = await ctx.clientBalances.getClientBalance(client);
        return clientBalance ? clientBalance.balance : 0;
    }

    /**
     *
     * @param {BasicFlightBookingManagerContext} ctx
     * @param {number} amountToAdd
     */
    async addToClientBalance(ctx, amountToAdd) {
        let client = ctx.clientIdentity.getID();
        let clientBalance = await ctx.clientBalances.getClientBalance(client);

        if (clientBalance) {
            clientBalance.balance = clientBalance.balance + amountToAdd;
            await ctx.clientBalances.updateClientBalance(clientBalance);
        } else {
            clientBalance = ClientBalance.createInstance(client, amountToAdd);
            await ctx.clientBalances.addElement(clientBalance);
        }
    }

    /**
     *
     * @param {BasicFlightBookingManagerContext} ctx
     * @param {String} flightId 
     * @returns {Promise<number>}
     */
    async querySeatsCount(ctx, flightId) {
        let flight = await ctx.flights.getFlight(flightId);
        return flight? flight.seats : 10;
    }

    /**
     *
     * @param {BasicFlightBookingManagerContext} ctx
     * @param {number} newCount
     * @param {String} flightId 
     * @returns {Promise<void>}
     */
    async changeSeatCount(ctx, flightId, newCount) {
        if (newCount < 0) {
            throw new Error('The new count must be a positive value!. Instead got: ' + newCount);
        }

        let flight = await ctx.flights.getFlight(flightId);

        if (flight) {
            flight.seats = newCount;
            await ctx.flights.updateFlight(flight);
        } else {
            flight = Flight.createInstance(flightId, newCount);
            await ctx.flights.addFlight(flight);
        }
    }

    /**
     *
     * @param {BasicFlightBookingManagerContext} ctx
     * @param {String} flightId 
     * @returns {Promise<number>}
     */
    async queryBookedSeatsCount(ctx, flightId) {
        let bookings = await ctx.bookingList.getAllBookings();
        return bookings.filter(booking => booking.getFlightId() === flightId).length;
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId 
     */
    async querySeatPrice(ctx, flightId) {
        return +(await ctx.flights.getFlight(flightId)).getSeatPrice();
    }

    /**
     * 
     * @param {BasicFlightBookingManagerContext} ctx 
     * @param {String} flightId 
     * @param {number} seatNumber 
     */
    async bookSeat(ctx, flightId, seatNumber) {
        let clientId = ctx.clientIdentity.getID();
        let isSeatAvailable = await this.isSeatAvailable(ctx, flightId, seatNumber);
        let hasReservation = await this.hasReservation(ctx, flightId);
        let balance = await this.queryClientBalance(ctx);
        let price = await this.querySeatPrice(ctx, flightId);

        if(isSeatAvailable && !hasReservation && balance >= price) {
            await this._deductFromClientBalance(ctx, price);
            let booking = Booking.createInstance(clientId, flightId, seatNumber);
            await ctx.bookingList.addBooking(booking);
        } else {
            throw new Error('Cannot reserve the seat!');
        }
    }

    async getReceipt(ctx) {
        return "0xacf6BadFa47BC05DB7C39Ba3Cd27003a3fD7E0c9";
    }

}

module.exports = BasicFlightBookingManager;