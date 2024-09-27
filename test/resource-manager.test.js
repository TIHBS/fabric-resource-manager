/*
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const {ChaincodeStub, ClientIdentity} = require('fabric-shim');
const {DateTime} = require('luxon');
const ResourceManagerContext = require('../lib/resource-manager/resource-manager-context');
const TxDetails = require('../lib/resource-manager/tx-details');
const Variable = require('../lib/resource-manager/variable');
const TxState = require("../lib/resource-manager/tx-state");
const ResourceManager = require("../lib/resource-manager/resource-manager");

let assert = sinon.assert;
chai.use(sinonChai);

describe('Resource Manager Basic Tests', () => {
    let transactionContext, chaincodeStub, lastEvent, identity;
    beforeEach(() => {
        transactionContext = new ResourceManagerContext();
        identity = sinon.createStubInstance(ClientIdentity);
        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);
        transactionContext.setClientIdentity(identity);

        identity.getID.callsFake(() => "user1");

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
                return prefix + ":" + attributes.join(":");
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

        chaincodeStub.getDateTimestamp.callsFake(async () => {
            return Promise.resolve(new Date());
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
    describe('Test Plumbing', () => {
            it('TxDetailsList functions properly', async () => {
                let now = DateTime.now();
                let tx = TxDetails.createInstance("a1", "me", now);
                await transactionContext.TxDetailsList.addTxDetails(tx);
                let tx2 = await transactionContext.TxDetailsList.getTxDetails("a1");
                expect(tx2.getState()).to.be.equal(TxState.STARTED);
                expect(tx2.getId()).to.be.equal("a1");
                expect(tx2.getOwner()).to.be.equal("me");
                expect(tx2.getTimeout().toISO() === now.toISO()).to.be.true;
                tx2.setState(TxState.ABORTED);
                await transactionContext.TxDetailsList.updateTxDetails(tx2);
                tx2 = await transactionContext.TxDetailsList.getTxDetails("a1");
                expect(tx2.getState()).to.be.equal(TxState.ABORTED);
                expect(tx2.getId()).to.be.equal("a1");
                expect(tx2.getOwner()).to.be.equal("me");
                expect(tx2.getTimeout().toISO() === now.toISO()).to.be.true;
            });

            it('VariableList functions properly', async () => {
                let variable = Variable.createInstance("var1", "rimi");
                await transactionContext.variableList.addVariable(variable);
                let var2 = await transactionContext.variableList.getVariable("var1");
                expect(var2.getValue()).to.be.equal("rimi");
                expect(var2.getName()).to.be.equal("var1");
                var2.setBeforeImage("bibi");
                var2.setWriteLockHolder("Ghareeb");
                var2.addReadLock("Bakri");
                await transactionContext.variableList.updateVariable(var2);
                var2 = await transactionContext.variableList.getVariable("var1");
                expect(var2.getValue()).to.be.equal("rimi");
                expect(var2.getName()).to.be.equal("var1");
                expect(var2.getBeforeImage()).to.be.equal("bibi");
                expect(var2.getWriteLockHolder()).to.be.equal("Ghareeb");
                expect(var2.getReadLocks().length).to.be.equal(1);
                expect(var2.getReadLocks().at(0)).to.be.equal("Bakri");
            });

            it('Emitting events works properly', async () => {
               transactionContext.stub.setEvent("help", Buffer.from(JSON.stringify({
                   owner: "me",
                   txId: "tx1",
                   isYes: "false"
               })));
               expect(lastEvent.name).to.be.equal("help");
               let eventObj = JSON.parse(lastEvent.payload.toString('utf8'));
                expect(eventObj.owner).to.be.equal("me");
                expect(eventObj.txId).to.be.equal("tx1");
                expect(eventObj.isYes).to.be.equal("false");
            });
        }
    );
    describe('Test happy path', () => {
        it('Test set variables, read them, reset them, prepare, and commit', async () => {
            let rm = new ResourceManager();
            let isSuccessful = await rm.setValue(transactionContext, "tx1Aa", "x1", "ghareeb");
            expect(isSuccessful).to.be.true;
            isSuccessful = await rm.setValue(transactionContext, "tx1Aa", "x2", "reem");
            expect(isSuccessful).to.be.true;
            let res = await rm.getValue(transactionContext, "tx1Aa", "x1");
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal("ghareeb");
            res = await rm.getValue(transactionContext, "tx1Aa", "x2");
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal("reem");
            isSuccessful = await rm.setValue(transactionContext, "tx1Aa", "x1", "lION");
            expect(isSuccessful).to.be.true;
            res = await rm.getValue(transactionContext, "tx1Aa", "x1");
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal("lION");
            let tx = await transactionContext.TxDetailsList.getTxDetails("tx1Aa");
            expect(tx.getState()).to.be.equal(TxState.STARTED);
            await rm.prepare(transactionContext, "tx1Aa");
            tx = await transactionContext.TxDetailsList.getTxDetails("tx1Aa");
            expect(tx.getState()).to.be.equal(TxState.PREPARED);
            expect(lastEvent.name).to.be.equal("Voted");
            let eventObj = JSON.parse(lastEvent.payload.toString('utf8'));
            expect(eventObj.owner).to.be.equal("user1");
            expect(eventObj.txId).to.be.equal("tx1Aa");
            expect(eventObj.isYes).to.be.equal("true");
            await rm.commit(transactionContext, "tx1Aa");
            tx = await transactionContext.TxDetailsList.getTxDetails("tx1Aa");
            expect(tx.getState()).to.be.equal(TxState.COMMITTED);

        });
        it ('Test read, prepare, and commit', async () => {
            let rm = new ResourceManager();
            let res = await rm.getValue(transactionContext, "tx1Aa", "x1");
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal(undefined);
            let tx = await transactionContext.TxDetailsList.getTxDetails("tx1Aa");
            expect(tx.getState()).to.be.equal(TxState.STARTED);
            await rm.prepare(transactionContext, "tx1Aa");
            tx = await transactionContext.TxDetailsList.getTxDetails("tx1Aa");
            expect(tx.getState()).to.be.equal(TxState.PREPARED);
            expect(lastEvent.name).to.be.equal("Voted");
            let eventObj = JSON.parse(lastEvent.payload.toString('utf8'));
            expect(eventObj.owner).to.be.equal("user1");
            expect(eventObj.txId).to.be.equal("tx1Aa");
            expect(eventObj.isYes).to.be.equal("true");
            await rm.commit(transactionContext, "tx1Aa");
            tx = await transactionContext.TxDetailsList.getTxDetails("tx1Aa");
            expect(tx.getState()).to.be.equal(TxState.COMMITTED);
        });
    });
});