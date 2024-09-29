/*
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const {ChaincodeStub, ClientIdentity} = require('fabric-shim');
const {DateTime, Duration} = require('luxon');
const ResourceManagerContext = require('../lib/resource-manager-context');
const TxDetails = require('../lib/tx-details');
const Variable = require('../lib/variable');
const TxState = require('../lib/tx-state');
const ResourceManager = require('../lib/resourceManager');
const {setTimeout} = require('timers/promises');

// let assert = sinon.assert;
chai.use(sinonChai);

describe('Resource Manager Basic Tests', () => {
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
    describe('Test Plumbing', () => {
        it('TxDetailsList functions properly', async () => {
            let now = DateTime.now();
            let tx = TxDetails.createInstance('a1', 'me', now);
            await transactionContext.TxDetailsList.addTxDetails(tx);
            let tx2 = await transactionContext.TxDetailsList.getTxDetails('a1');
            expect(tx2.getState()).to.be.equal(TxState.UNDEFINED);
            expect(tx2.getId()).to.be.equal('a1');
            expect(tx2.getOwner()).to.be.equal('me');
            expect(tx2.getTimeout().toISO() === now.toISO()).to.be.true;
            tx2.setState(TxState.ABORTED);
            await transactionContext.TxDetailsList.updateTxDetails(tx2);
            tx2 = await transactionContext.TxDetailsList.getTxDetails('a1');
            expect(tx2.getState()).to.be.equal(TxState.ABORTED);
            expect(tx2.getId()).to.be.equal('a1');
            expect(tx2.getOwner()).to.be.equal('me');
            expect(tx2.getTimeout().toISO() === now.toISO()).to.be.true;
        });

        it('VariableList functions properly', async () => {
            let variable = Variable.createInstance('var1', 'rimi');
            await transactionContext.variableList.addVariable(variable);
            let var2 = await transactionContext.variableList.getVariable('var1');
            expect(var2.getValue()).to.be.equal('rimi');
            expect(var2.getName()).to.be.equal('var1');
            var2.setBeforeImage('bibi');
            var2.setWriteLockHolder('Ghareeb');
            var2.addReadLock('Bakri');
            await transactionContext.variableList.updateVariable(var2);
            var2 = await transactionContext.variableList.getVariable('var1');
            expect(var2.getValue()).to.be.equal('rimi');
            expect(var2.getName()).to.be.equal('var1');
            expect(var2.getBeforeImage()).to.be.equal('bibi');
            expect(var2.getWriteLockHolder()).to.be.equal('Ghareeb');
            expect(var2.getReadLocks().length).to.be.equal(1);
            expect(var2.getReadLocks().at(0)).to.be.equal('Bakri');
        });

        it('Emitting events works properly', async () => {
            transactionContext.stub.setEvent('help', Buffer.from(JSON.stringify({
                owner: 'me',
                txId: 'tx1',
                isYes: 'false'
            })));
            expect(lastEvent.name).to.be.equal('help');
            let eventObj = JSON.parse(lastEvent.payload.toString('utf8'));
            expect(eventObj.owner).to.be.equal('me');
            expect(eventObj.txId).to.be.equal('tx1');
            expect(eventObj.isYes).to.be.equal('false');
        });
    }
    );
    describe('Test happy path', () => {
        it('Test set variables, read them, reset them, prepare, and commit', async () => {
            let rm = new ResourceManager();
            let isSuccessful = await rm.setValue(transactionContext, 'tx1Aa', 'x1', 'ghareeb');
            expect(isSuccessful).to.be.true;
            isSuccessful = await rm.setValue(transactionContext, 'tx1Aa', 'x2', 'reem');
            expect(isSuccessful).to.be.true;
            let res = await rm.getValue(transactionContext, 'tx1Aa', 'x1');
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal('ghareeb');
            res = await rm.getValue(transactionContext, 'tx1Aa', 'x2');
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal('reem');
            isSuccessful = await rm.setValue(transactionContext, 'tx1Aa', 'x1', 'lION');
            expect(isSuccessful).to.be.true;
            res = await rm.getValue(transactionContext, 'tx1Aa', 'x1');
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal('lION');
            let tx = await transactionContext.TxDetailsList.getTxDetails('tx1Aa');
            expect(tx.getState()).to.be.equal(TxState.STARTED);
            await rm.prepare(transactionContext, 'tx1Aa');
            tx = await transactionContext.TxDetailsList.getTxDetails('tx1Aa');
            expect(tx.getState()).to.be.equal(TxState.PREPARED);
            expect(lastEvent.name).to.be.equal('Voted');
            let eventObj = JSON.parse(lastEvent.payload.toString('utf8'));
            expect(eventObj.owner).to.be.equal('user1');
            expect(eventObj.txId).to.be.equal('tx1Aa');
            expect(eventObj.isYes).to.be.equal('true');
            await rm.commit(transactionContext, 'tx1Aa');
            tx = await transactionContext.TxDetailsList.getTxDetails('tx1Aa');
            expect(tx.getState()).to.be.equal(TxState.COMMITTED);
            let x1 = await transactionContext.variableList.getVariable('x1');
            expect(x1.getValue()).to.be.equal('lION');
            expect(x1.getReadLocks().length).to.be.equal(0);
            expect(x1.getWriteLockHolder()).to.be.equal(null);
            let x2 = await transactionContext.variableList.getVariable('x2');
            expect(x2.getValue()).to.be.equal('reem');
            expect(x2.getReadLocks().length).to.be.equal(0);
            expect(x2.getWriteLockHolder()).to.be.equal(null);
        });
        it('Test read, prepare, and commit', async () => {
            let rm = new ResourceManager();
            let res = await rm.getValue(transactionContext, 'tx1Aa', 'x1');
            expect(res.isSuccessful).to.be.true;
            expect(res.value).to.be.equal(null);
            let tx = await transactionContext.TxDetailsList.getTxDetails('tx1Aa');
            expect(tx.getState()).to.be.equal(TxState.STARTED);
            await rm.prepare(transactionContext, 'tx1Aa');
            tx = await transactionContext.TxDetailsList.getTxDetails('tx1Aa');
            expect(tx.getState()).to.be.equal(TxState.PREPARED);
            expect(lastEvent.name).to.be.equal('Voted');
            let eventObj = JSON.parse(lastEvent.payload.toString('utf8'));
            expect(eventObj.owner).to.be.equal('user1');
            expect(eventObj.txId).to.be.equal('tx1Aa');
            expect(eventObj.isYes).to.be.equal('true');
            await rm.commit(transactionContext, 'tx1Aa');
            tx = await transactionContext.TxDetailsList.getTxDetails('tx1Aa');
            expect(tx.getState()).to.be.equal(TxState.COMMITTED);
        });
    });
    describe('Test user ABORT', () => {
        it('Test user abort after set', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            let variable = await transactionContext.variableList.getVariable('x1');
            expect(variable.getBeforeImage()).to.be.equal(null);
            expect(variable.getValue()).to.be.equal('ghareeb');
            await res.abort(transactionContext, 'tx1');
            let tx = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx.getState()).to.be.equal(TxState.ABORTED);
            variable = await transactionContext.variableList.getVariable('x1');
            expect(variable.getValue()).to.be.equal(null);
            expect(variable.getReadLocks().length).to.be.equal(0);
            expect(variable.getWriteLockHolder()).to.be.null;
            let success = await res.setValue(transactionContext, 'tx2', 'x1', 'reem');
            expect(success).to.be.true;
        });
        it('Test user abort after PREPARED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            let variable = await transactionContext.variableList.getVariable('x1');
            expect(variable.getBeforeImage()).to.be.equal(null);
            expect(variable.getValue()).to.be.equal('ghareeb');
            await res.prepare(transactionContext, 'tx1');
            let tx = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx.getState()).to.be.equal(TxState.PREPARED);
            await res.abort(transactionContext, 'tx1');
            tx = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx.getState()).to.be.equal(TxState.ABORTED);
            variable = await transactionContext.variableList.getVariable('x1');
            expect(variable.getValue()).to.be.equal(null);
            let success = await res.setValue(transactionContext, 'tx2', 'x1', 'reem');
            expect(success).to.be.true;
        });
        it('Test user abort after ABORTED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            let variable = await transactionContext.variableList.getVariable('x1');
            expect(variable.getBeforeImage()).to.be.equal(null);
            expect(variable.getValue()).to.be.equal('ghareeb');
            await res.abort(transactionContext, 'tx1');
            let tx = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx.getState()).to.be.equal(TxState.ABORTED);
            variable = await transactionContext.variableList.getVariable('x1');
            expect(variable.getValue()).to.be.equal(null);
            await res.abort(transactionContext, 'tx1');
            tx = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx.getState()).to.be.equal(TxState.ABORTED);
            variable = await transactionContext.variableList.getVariable('x1');
            expect(variable.getValue()).to.be.equal(null);
            let success = await res.setValue(transactionContext, 'tx2', 'x1', 'reem');
            expect(success).to.be.true;
        });
        it('Test failed user ABORT because not STARTED', async () => {
            let res = new ResourceManager();
            let err = undefined;

            try {
                await res.abort(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;

        });
        it('Test failed user ABORT because COMMITTED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await res.prepare(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx1');
            let err = undefined;

            try {
                await res.abort(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });
    });
    describe('Test PREPARE', () => {
        it('Test failed PREPARE because not STARTED', async () => {
            let res = new ResourceManager();
            let err = undefined;

            try {
                await res.prepare(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });
        it('Test failed PREPARE after COMMITTED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await res.prepare(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx1');
            let err = undefined;

            try {
                await res.prepare(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });
        it('Test failed PREPARE after PREPARED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await res.prepare(transactionContext, 'tx1');
            let err = undefined;

            try {
                await res.prepare(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });
        it('Test PREPARE after ABORTED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await res.abort(transactionContext, 'tx1');
            await res.prepare(transactionContext, 'tx1');
            expect(lastEvent.name).to.be.equal('Voted');
            let eventObj = JSON.parse(lastEvent.payload.toString('utf8'));
            expect(eventObj.owner).to.be.equal('user1');
            expect(eventObj.txId).to.be.equal('tx1');
            expect(eventObj.isYes).to.be.equal('false');
        });
    });
    describe('Test COMMIT', () => {
        it('Test failed COMMIT because not started', async () => {
            let res = new ResourceManager();
            let err = undefined;

            try {
                await res.commit(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });

        it('Test failed COMMIT because ABORTED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await res.abort(transactionContext, 'tx1');
            let err = undefined;

            try {
                await res.commit(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });

        it('Test failed COMMIT because COMMITTED', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await res.prepare(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx1');
            let err = undefined;

            try {
                await res.commit(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });
    });
    describe('Test multiple transactions', () => {
        it('Two non-interacting transactions', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            let success = await res.setValue(transactionContext, 'tx2', 'x2', 'reem');
            expect(success).to.be.true;
            let result = await res.getValue(transactionContext, 'tx1', 'x1');
            expect(result.isSuccessful).to.be.true;
            expect(result.value).to.be.equal('ghareeb');
            result = await res.getValue(transactionContext, 'tx2', 'x2');
            expect(result.isSuccessful).to.be.true;
            expect(result.value).to.be.equal('reem');
            await res.prepare(transactionContext, 'tx1');
            await res.prepare(transactionContext, 'tx2');
            await res.commit(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx2');
            let tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.COMMITTED);
            let tx2 = await transactionContext.TxDetailsList.getTxDetails('tx2');
            expect(tx2.getState()).to.be.equal(TxState.COMMITTED);
        });

        it('Two interacting, non-conflicting transactions', async () => {
            let res = new ResourceManager();
            let result = await res.getValue(transactionContext, 'tx1', 'x1');
            expect(result.isSuccessful).to.be.true;
            expect(result.value).to.be.equal(null);
            result = await res.getValue(transactionContext, 'tx2', 'x1');
            expect(result.isSuccessful).to.be.true;
            expect(result.value).to.be.equal(null);
            await res.prepare(transactionContext, 'tx1');
            await res.prepare(transactionContext, 'tx2');
            await res.commit(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx2');
            let tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.COMMITTED);
            let tx2 = await transactionContext.TxDetailsList.getTxDetails('tx2');
            expect(tx2.getState()).to.be.equal(TxState.COMMITTED);
        });

        it('Two conflicting transactions (write-read)', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            let result = await res.getValue(transactionContext, 'tx2', 'x1');
            expect(result.isSuccessful).to.be.false;
            expect(result.value).to.be.equal(null);
            let tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.STARTED);
            let tx2 = await transactionContext.TxDetailsList.getTxDetails('tx2');
            expect(tx2.getState()).to.be.equal(TxState.ABORTED);
            await res.prepare(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx1');
            tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.COMMITTED);
        });

        it('Two conflicting transactions (read-write)', async () => {
            let res = new ResourceManager();
            await res.getValue(transactionContext, 'tx1', 'x1');
            let isSuccessful = await res.setValue(transactionContext, 'tx2', 'x1', 'reem');
            expect(isSuccessful).to.be.false;
            let tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.STARTED);
            let tx2 = await transactionContext.TxDetailsList.getTxDetails('tx2');
            expect(tx2.getState()).to.be.equal(TxState.ABORTED);
            await res.prepare(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx1');
            tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.COMMITTED);
        });

        it('Two conflicting transactions (write-write)', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            let isSuccessful = await res.setValue(transactionContext, 'tx2', 'x1', 'reem');
            expect(isSuccessful).to.be.false;
            let tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.STARTED);
            let tx2 = await transactionContext.TxDetailsList.getTxDetails('tx2');
            expect(tx2.getState()).to.be.equal(TxState.ABORTED);
            await res.prepare(transactionContext, 'tx1');
            await res.commit(transactionContext, 'tx1');
            tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.COMMITTED);
        });

        it('Two conflicting transactions (first pass deadline)', async () => {
            let res = new ResourceManager();
            res.maxLockDuration = Duration.fromObject({milliseconds: 5});
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await setTimeout(100);
            let isSuccessful = await res.setValue(transactionContext, 'tx2', 'x1', 'reem');
            expect(isSuccessful).to.be.true;
            let tx1 = await transactionContext.TxDetailsList.getTxDetails('tx1');
            expect(tx1.getState()).to.be.equal(TxState.ABORTED);
            let tx2 = await transactionContext.TxDetailsList.getTxDetails('tx2');
            expect(tx2.getState()).to.be.equal(TxState.STARTED);
            await res.prepare(transactionContext, 'tx2');
            await res.commit(transactionContext, 'tx2');
            tx1 = await transactionContext.TxDetailsList.getTxDetails('tx2');
            expect(tx1.getState()).to.be.equal(TxState.COMMITTED);
        });
    });

    describe('Change user identity', () => {
        it('Different user in set', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            identity.special = 'user2';
            let err = undefined;

            try {
                await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });

        it('Different user in get', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            identity.special = 'user2';
            let err = undefined;

            try {
                await res.getValue(transactionContext, 'tx1', 'x1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });

        it('Different user in PREPARE', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            identity.special = 'user2';
            let err = undefined;

            try {
                await res.prepare(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });

        it('Different user in ABORT', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            identity.special = 'user2';
            let err = undefined;

            try {
                await res.abort(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });

        it('Different user in COMMIT', async () => {
            let res = new ResourceManager();
            await res.setValue(transactionContext, 'tx1', 'x1', 'ghareeb');
            await res.prepare(transactionContext, 'tx1');
            identity.special = 'user2';
            let err = undefined;

            try {
                await res.commit(transactionContext, 'tx1');
            } catch(e) {
                err = e;
            }

            expect(err).to.not.be.undefined;
        });
    });
});