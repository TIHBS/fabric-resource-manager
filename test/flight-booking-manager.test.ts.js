/*
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
const {ChaincodeStub, ClientIdentity} = require('fabric-shim');
const ResourceManagerContext = require('../lib/resource-manager-context');
const FlightBookingManager = require('../lib/flight-booking-manager');

// let assert = sinon.assert;
chai.use(sinonChai);

describe('Flights Manager Basic Tests', () => {
    // eslint-disable-next-line no-unused-vars
    let transactionContext, chaincodeStub, lastEvent, identity;
    beforeEach(() => {
        transactionContext = new ResourceManagerContext();
        identity = sinon.createStubInstance(ClientIdentity);
        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);
        transactionContext.setClientIdentity(identity);

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
        it('book seat, take flight', async () => {
            let man = new FlightBookingManager();
            let value = await man.querySeatPrice(transactionContext, 'tx1', 'user1');
            expect(value).to.be.equal(500);
            value = await man.querySeatsCount(transactionContext, 'tx1', 'user1');
            expect(value).to.be.equal(10);
            await man.addToClientBalance(transactionContext, 'tx1', 'user1', 700);
            value = await man.queryClientBalance(transactionContext, 'tx1', 'user1');
            expect(value).to.be.equal(700);
            value = await man.hasReservation(transactionContext, 'tx1', 'user1');
            expect(value).to.be.false;
            value = await man.queryNextAvailableSeat(transactionContext, 'tx1', 'user1');
            expect(value).to.be.equal(0);

            await man.bookSeat(transactionContext, 'tx1', 'user1', value);

            value = await man.hasReservation(transactionContext, 'tx1', 'user1');
            expect(value).to.be.true;
            value = await man.queryClientBalance(transactionContext, 'tx1', 'user1');
            expect(value).to.be.equal(200);
            value = await man.isASeatAvailable(transactionContext, 'tx1', 'user1');
            expect(value).to.be.true;
            value = await man.isSeatBookedByClient(transactionContext, 'tx1', 'user1', 0);
            expect(value).to.be.true;
            value = await man.isSeatAvailable(transactionContext, 'tx1', 'user1', 0);
            expect(value).to.be.false;

            await man.endFlight(transactionContext, 'tx1', 'user1');

            value = await man.isASeatAvailable(transactionContext, 'tx1', 'user1');
            expect(value).to.be.true;
            value = await man.isSeatAvailable(transactionContext, 'tx1', 'user1', 0);
            expect(value).to.be.true;
            value = await man.isSeatBookedByClient(transactionContext, 'tx1', 'user1', 0);
            expect(value).to.be.false;
            value = await man.queryNextAvailableSeat(transactionContext, 'tx1', 'user1');
            expect(value).to.be.equal(0);
            value = await man.queryBookedSeatsCount(transactionContext, 'tx1', 'user1');
            expect(value).to.be.equal(0);
            value = await man.hasReservation(transactionContext, 'tx1', 'user1');
            expect(value).to.be.false;
        });

    });
});
