/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const State = require('../ledger-api/state');

class Variable extends State {

    constructor(obj) {
        super([obj.name]);
        Object.assign(this, obj);
    }

    /**
     *
     * @returns {String}
     */
    getName() {
        return this.name;
    }

    setName(newName) {
        this.name = newName;
    }

    /**
     *
     * @returns {String}
     */
    getValue() {
        return this.value;
    }

    /**
     *
     * @param {String} newValue
     */
    setValue(newValue) {
        this.value = newValue;
    }

    /**
     *
     * @returns {String}
     */
    getBeforeImage() {
        return this.beforeImage;
    }

    /**
     *
     * @param {String} newBeforeImage
     */
    setBeforeImage(newBeforeImage) {
        this.beforeImage = newBeforeImage;
    }

    /**
     *
     * @returns {String|null}
     */
    getWriteLockHolder() {
        return this.writeLockHolder;
    }

    /**
     *
     * @param {String} newWriteLockHolder
     */
    setWriteLockHolder(newWriteLockHolder) {
        this.writeLockHolder = newWriteLockHolder;
    }

    /**
     *
     * @returns {Array<String>}
     */
    getReadLocks() {
        return this.readLockHolders;
    }

    addReadLock(txId) {
        if (!this.getReadLocks()) {
            this.readLockHolders = [];
        }
        if (this.getReadLocks().indexOf(txId) < 0) {
            this.getReadLocks().push(txId);
        }
    }

    removeReadLock(txId) {
        this.readLockHolders = this.getReadLocks()
            .filter(tx => tx !== txId);
    }


    /**
     *
     * @param {Buffer} buffer
     * @returns {Variable}
     */
    static fromBuffer(buffer) {
        return this.deserialize(State.jsonFromBuffer(buffer));
    }


    /**
     * Deserialize a state data to a variable object
     * @param {JSON} data to form back into the object
     */
    static deserialize(data) {
        return new Variable(data);
    }

    /**
     * Factory method to create a variable object
     *
     * @param {String} name
     * @param {String} value
     */
    static createInstance(name, value) {
        return new Variable({ name: name, value: value, beforeImage: null, writeLockHolder: null, readLockHolders: [] });
    }

}

module.exports = Variable;