/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ResourceManagerContext = require('./resource-manager-context.js');
const TxDetails = require('./tx-details.js');
const TxState = require('./tx-state.js');
const LockType = require('./lock-type.js');
const Variable = require('./variable.js');
const {DateTime, Duration} = require('luxon');


class ResourceManager extends Contract {

    constructor() {
        super("resource-manager");
        this.maxLockDuration = Duration.fromObject({minutes: 5});
    }

    createContext() {
        return new ResourceManagerContext();
    }

    async instantiate(ctx) {
        console.log('**** Instantiate the ResourceManager contract ****');
    }

    /**
     *
     * @param ctx {ResourceManagerContext}
     * @param txId {String}
     * @returns {Promise<Boolean>}
     * @private
     */
    async _ensureStarted(ctx, txId) {
        let txDetails = await ctx.TxDetailsList.getTxDetails(txId);

        if (!txDetails) {
            const now = ctx.stub.getDateTimestamp();
            const timeout = DateTime.fromJSDate(now).plus(this.maxLockDuration);
            txDetails = TxDetails.createInstance(txId, ctx.clientIdentity.getID(), timeout);
            txDetails.setState(TxState.STARTED);
            await ctx.TxDetailsList.addTxDetails(txDetails);
        }

        return txDetails.getState() === TxState.STARTED;
    }

    /**
     *
     * @param {String} txId
     * @param {ResourceManagerContext} ctx
     * @returns {Promise<void>}
     * @private
     */
    async _requireSameOwner(ctx, txId) {
        const tx = await ctx.TxDetailsList.getTxDetails(txId);

        if (tx) {
            const owner = tx.getOwner();

            if (owner !== ctx.clientIdentity.getID()) {
                throw new Error("Message sender (" + ctx.clientIdentity.getID() + ") is not owner of global transaction!");
            }
        } else {
            throw new Error("The global transaction (" + txId + ") does not exist!");
        }
    }

    /**
     *
     * @param {String} txId
     * @param {ResourceManagerContext} ctx
     * @returns {Promise<void>}
     */
    async _requireTxStarted(ctx, txId) {
        const isStarted = await this._ensureStarted(ctx, txId);

        if (!isStarted) {
            throw new Error("The global transaction (" + txId + ") must be STARTED, but it is not!");
        }
    }

    /**
     *
     * @param ctx {ResourceManagerContext}
     * @param txId {String}
     * @param allowedStates {Array<TxState>}
     * @returns {Promise<void>}
     * @private
     */
    async _requireTxStates(ctx, txId, allowedStates) {
        let txDetails = await ctx.TxDetailsList.getTxDetails(txId);

        if (!txDetails) {
            throw new Error("The global transaction (" + txId + ") does not exist!");
        }

        if (allowedStates.indexOf(txDetails.getState()) < 0) {
            throw new Error("The state of the global transaction (" + txId + ") is invalid!");
        }
    }

    /**
     *
     * @param ctx {ResourceManagerContext}
     * @param variableName {String}
     * @param txId {String}
     * @param lockType {LockType}
     * @returns {Promise<{isSuccessful: Boolean, isNewLock: Boolean}>}
     * @private
     */
    async _acquireLock(ctx, variableName, txId, lockType) {
        let variable = await ctx.variableList.getVariable(variableName);

        if (!variable) {
            variable = Variable.createInstance(variableName, null);
            await ctx.variableList.addVariable(variable);
        }

        // We don't need a new lock in either of the following cases:
        // 1) if WL and tx has a write lock on the variable.
        // 2) if RL and tx has any lock on the variable.
        if ((lockType === LockType.WRITE_LOCK && variable.getWriteLockHolder() === txId) ||
            (lockType === LockType.READ_LOCK && (variable.getWriteLockHolder() === txId || variable.getReadLocks().indexOf(txId) >= 0))) {

            return {isSuccessful: true, isNewLock: false};
        }

        // Else, we need to set a new lock in either of the following cases:
        // 1) if RL and there are no write locks by others.
        // 2) if WL and there are no locks at all by others.
        if ((lockType === LockType.READ_LOCK && variable.getWriteLockHolder() == null) ||
            (lockType === LockType.WRITE_LOCK && !ResourceManager._isVariableLockedByOtherTx(variable, txId))) {
            await this._lock(ctx, variable, txId, lockType);

            return {isSuccessful: true, isNewLock: true};
        }

        // Else, we found conflicts. Can we still obtain the lock?
        const now = DateTime.fromJSDate(ctx.stub.getDateTimestamp());
        /**
         * @type {TxDetails[]}
         */
        const allHolders = [];

        for (let currLock of variable.getReadLocks()) {
            let currentTx = await ctx.TxDetailsList.getTxDetails(currLock);
            allHolders.push(currentTx);
        }

        if (variable.getWriteLockHolder() != null) {
            allHolders.push(await ctx.TxDetailsList.getTxDetails(variable.getWriteLockHolder()));
        }

        // Have ALL existing lock holders exceeded their timeouts? we can remove their locks!
        if (allHolders.every(tx => now > tx.getTimeout())) {

            // Abort the other transactions
            for (let currTx of allHolders) {
                await this._doAbort(ctx, currTx.getId());
            }
            // Lock the transaction
            await this._lock(ctx, variable, txId, lockType);

            return {isSuccessful: true, isNewLock: true};
        }

        // We cannot lock!
        return {isSuccessful: false, isNewLock: false};
    }

    /**
     *
     * @param variable {Variable}
     * @param txId {String}
     * @return {Boolean}
     * @private
     */
    static _isVariableLockedByOtherTx(variable, txId) {
        return (variable.getWriteLockHolder() != null && variable.getWriteLockHolder() !== txId) ||
            variable.getReadLocks().filter(lock => lock !== txId).length > 0;
    }

    /**
     * Locks a variable for reading or writing. The variable is assumed to exist, and the lock conditions to be met.
     * @param {Variable} variable
     * @param {String} txId
     * @param {ResourceManagerContext} ctx
     * @param {LockType} lockType
     * @returns {Promise<void>}
     */
    async _lock(ctx, variable, txId, lockType) {
        if (lockType === LockType.WRITE_LOCK) {
            variable.setWriteLockHolder(txId);
            variable.removeReadLock(txId);
        } else {
            variable.addReadLock(txId);
        }

        await ctx.variableList.updateVariable(variable);
    }


    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {Boolean} revoke
     */
    async _releaseLocks(ctx, txId, revoke) {
        const variables = await ctx.variableList.getAllVariables();

        for (let variable of variables) {

            if (variable.getWriteLockHolder() === txId) {
                variable.setWriteLockHolder(null);

                if (revoke) {
                    variable.setValue(variable.getBeforeImage());
                }
            } else if (variable.getReadLocks().indexOf(txId) >= 0) {
                variable.removeReadLock(txId);
            }

            await ctx.variableList.updateVariable(variable);
        }
    }


    /**
     *
     * @param ctx {ResourceManagerContext}
     * @param txId {String}
     * @returns {Promise<void>}
     * @private
     */
    async _doAbort(ctx, txId) {
        const tx = await ctx.TxDetailsList.getTxDetails(txId);
        tx.setState(TxState.ABORTED);
        await ctx.TxDetailsList.updateTxDetails(tx);
        await this._releaseLocks(ctx, txId, true);
    }

    /**
     *
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     * @param {String} variableName
     * @param {String} variableValue
     * @return {Promise<Boolean>} indicates success.
     */
    async setValue(ctx, txId, variableName, variableValue) {
        await this._requireTxStarted(ctx, txId);
        await this._requireSameOwner(ctx, txId);
        // this operation also ensures the variable exists.
        let {isSuccessful, isNewLock} = await this._acquireLock(ctx, variableName, txId, LockType.WRITE_LOCK);

        if (!isSuccessful) {
            await this._doAbort(ctx, txId);

            return false;
        } else {
            const variable = await ctx.variableList.getVariable(variableName);
            // 1st time txId sets this variable
            if (isNewLock) {
                variable.setBeforeImage(variable.getValue());
            }

            variable.setValue(variableValue);
            await ctx.variableList.updateVariable(variable);

            return true;
        }
    }

    /**
     *
     * @param ctx {ResourceManagerContext}
     * @param txId {String}
     * @param variableName {String}
     * @returns {Promise<{isSuccessful: boolean, value: null}|{isSuccessful: boolean, value: String}>}
     */
    async getValue(ctx, txId, variableName) {
        await this._requireTxStarted(ctx, txId);
        await this._requireSameOwner(ctx, txId);

        let {isSuccessful, isNewLock} = await this._acquireLock(ctx, variableName, txId, LockType.READ_LOCK);

        if (!isSuccessful) {
            await this._doAbort(ctx, txId);

            return {isSuccessful: false, value: null};
        } else {
            return {isSuccessful: true, value: (await ctx.variableList.getVariable(variableName)).getValue()};
        }
    }

    /**
     *
     * @param ctx {ResourceManagerContext}
     * @param txId {String}
     * @returns {Promise<void>}
     */
    async prepare(ctx, txId) {
        await this._requireSameOwner(ctx, txId);
        await this._requireTxStates(ctx, txId, [TxState.STARTED, TxState.ABORTED]);
        let tx = await ctx.TxDetailsList.getTxDetails(txId);

        if (tx.getState() === TxState.STARTED) {
            tx.setState(TxState.PREPARED);
            await ctx.TxDetailsList.updateTxDetails(tx);
            ctx.stub.setEvent("Voted", Buffer.from(JSON.stringify({
                owner: tx.getOwner(),
                txId: tx.getId(),
                isYes: "true"
            })));
            console.info('**** Transaction (id: ' + txId + ') voted YES! ****');
        } else {
            ctx.stub.setEvent("Voted", Buffer.from(JSON.stringify({
                owner: tx.getOwner(),
                txId: tx.getId(),
                isYes: "false"
            })));
            console.info('**** Transaction (id: ' + txId + ') voted NO! ****');
        }
    }

    /**
     *
     * @param ctx {ResourceManagerContext}
     * @param txId {String}
     * @returns {Promise<void>}
     */
    async commit(ctx, txId) {
        await this._requireSameOwner(ctx, txId);
        await this._requireTxStates(ctx, txId, [TxState.PREPARED]);
        let tx = await ctx.TxDetailsList.getTxDetails(txId);
        tx.setState(TxState.COMMITTED);
        await ctx.TxDetailsList.updateTxDetails(tx);
        await this._releaseLocks(ctx, txId, false);
        console.info('**** Transaction (id: ' + txId + ') committed! ****');
    }

    /**
     * Aborts a global transaction
     * @param {ResourceManagerContext} ctx
     * @param {String} txId
     */
    async abort(ctx, txId) {
        await this._requireSameOwner(ctx, txId);
        await this._requireTxStates(ctx, txId, [TxState.PREPARED, TxState.ABORTED, TxState.STARTED]);
        let tx = await ctx.TxDetailsList.getTxDetails(txId);

        if (tx.getState() !== TxState.ABORTED) {
            await this._doAbort(ctx, txId);
        }

        console.info('**** Transaction (id: ' + txId + ') aborted! ****');
    }
}

module.exports = ResourceManager;