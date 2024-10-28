/*
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
const {ChaincodeStub, ClientIdentity} = require('fabric-shim');
const BasicFlightBookingManagerContext = require('../lib/basic-flight-booking-manager/basic-flight-booking-manager-context');
const BasicFlightBookingManager = require('../lib/basic-flight-booking-manager/basic-flight-booking-manager');

// let assert = sinon.assert;
chai.use(sinonChai);

describe('Basic Flights Manager Basic Tests', () => {
    // eslint-disable-next-line no-unused-vars
    let context, chaincodeStub, lastEvent, identity;
    beforeEach(() => {
        context = new BasicFlightBookingManagerContext();
        identity = sinon.createStubInstance(ClientIdentity);
        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        context.setChaincodeStub(chaincodeStub);
        context.setClientIdentity(identity);

        identity.getID.callsFake(() => {
            if (identity.special) {
                return identity.special;
            }
            return 'user1';
        });

        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.createCompositeKey.callsFake(
            /**
             *
             * @param {String} prefix
             * @param {Array<String>} attributes
             * @returns {string}
             */
            (prefix, attributes) => {
                return prefix + ':' + attributes.join(':');
            });

        chaincodeStub.getStateByPartialCompositeKey.callsFake(async (prefix) => {
            function* internalGetStateByCompositeKey() {
                if (chaincodeStub.states) {
                    // Shallow copy
                    const copied = Object.assign({}, chaincodeStub.states);

                    for (let key in copied) {
                        if (key.includes(prefix)) {
                            yield {value: copied[key]};
                        }
                    }
                }
            }

            return Promise.resolve(internalGetStateByCompositeKey());
        });

        chaincodeStub.getDateTimestamp.callsFake(() => {
            return new Date();
        });

        chaincodeStub.setEvent.callsFake(
            /**
             *
             * @param {String} name
             * @param {Uint8Array} payload
             * @returns {Promise<Awaited<Generator<{value: *}, void, *>>>}
             */
            async (name, payload) => {
                lastEvent = {name: name, payload: payload};
            });

    });

    describe('Test happy path', () => {
        it('queries client balance', async () => {
            let man = new BasicFlightBookingManager();
            let value = await man.queryClientBalance(context);
            expect(value).to.be.equal(0);
            await man.addToClientBalance(context, 1234);
            value = await man.queryClientBalance(context);
            expect(value).to.be.equal(1234);
            await man.addToClientBalance(context, 16);
            value = await man.queryClientBalance(context);
            expect(value).to.be.equal(1250);
        });

        it('change seats count', async () => {
            let man = new BasicFlightBookingManager();
            let value = await man.querySeatsCount(context, 'A');
            expect(value).to.be.equal(10);
            await man.changeSeatCount(context, 'A', 20);
            value = await man.querySeatsCount(context, 'A');
            expect(value).to.be.equal(20);
            await man.createFlight(context, 'B', 500, 1200);
            value = await man.querySeatPrice(context, 'B');
            expect(value).to.be.equal(1200);
            value = await man.querySeatsCount(context, 'B');
            expect(value).to.be.equal(500);
        });

        it('scenario', async ()=> {
            let man = new BasicFlightBookingManager();
            await man.createFlight(context, 'A', 300, 1000);
            let price = await man.querySeatPrice(context, 'A');
            expect(price).to.be.equal(1000);
            let places = await man.querySeatsCount(context, 'A');
            expect(places).to.be.equal(300);
            let booked = await man.queryBookedSeatsCount(context, 'A');
            expect(booked).to.be.equal(0);
            let isASeatAvailable = await man.isASeatAvailable(context, 'A');
            expect(isASeatAvailable).to.be.true;
            let nextAvailable = await man.queryNextAvailableSeat(context, 'A');
            expect(nextAvailable).to.be.equal(1);
            await man.addToClientBalance(context, 2000);
            await man.bookSeat(context, 'A', 22);
            isASeatAvailable = await man.isASeatAvailable(context, 'A');
            expect(isASeatAvailable).to.be.true;
            let isSeat22Available = await man.isSeatAvailable(context, 'A', 22);
            expect(isSeat22Available).to.be.false;
            let balance = await man.queryClientBalance(context);
            expect(balance).to.be.equal(2000 - 1000);
            let hasRes = await man.hasReservation(context, 'A');
            expect(hasRes).to.be.true;
            let isSeatBookedByClient = await man.isSeatBookedByClient(context, 'A', 22);
            expect(isSeatBookedByClient).to.be.true;
            isSeatBookedByClient = await man.isSeatBookedByClient(context, 'A', 1);
            expect(isSeatBookedByClient).to.be.false;
            booked = await man.queryBookedSeatsCount(context, 'A');
            expect(booked).to.be.equal(1);
        });

    });
});
