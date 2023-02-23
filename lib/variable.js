/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const State = require('./../ledger-api/state.js');

class Variable extends State {

    constructor(obj) {
        super([obj.name]);
        Object.assign(this, obj);
    }

    /**
     * 
     * @returns {string}
     */
    getName() {
        return this.name;
    }

    setName(newName) {
        this.name = newName;
    }

    /**
     * 
     * @returns {string}
     */
    getValue() {
        return this.value;
    }

    /**
     * 
     * @param {string} newValue 
     */
    setValue(newValue) {
        this.value = newValue;
    }

    /**
     * 
     * @returns {string}
     */
    getBeforeImage() {
        return this.beforeImage;
    }

    /**
     * 
     * @param {string} newBeforeImage 
     */
    setBeforeImage(newBeforeImage) {
        this.beforeImage = newBeforeImage;
    }

    /**
     * 
     * @returns {string}
     */
    getWriteLockHolder() {
        return this.writeLockHolder;
    }

    /**
     * 
     * @param {string} newWriteLockHolder 
     */
    setWriteLockHolder(newWriteLockHolder) {
        this.writeLockHolder = newWriteLockHolder;
    }

    /**
     * 
     * @returns {Array<string>}
     */
    getReadLockHolders() {
        return this.readLockHolders;
    }

    /**
     * 
     * @param {Array<string>} newReadLockHolders 
     */
    setReadLockHolders(newReadLockHolders) {
        this.readLockHolders = newReadLockHolders;
    }



    /**
     * 
     * @param {Buffer} buffer 
     * @returns {Variable}
     */
    static fromBuffer(buffer) {
        return new Variable(State.deserialize(buffer));
    }

    /**
     * 
     * @returns {Buffer}
     */
    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to a variable object
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return this.fromBuffer(data);
    }

    /**
     * Factory method to create a variable object
     * 
     * @param {string} name
     * @param {string} value
     */
    static createInstance(name, value) {
        return new Variable({ name: name, value: value, beforeImage: undefined, writeLockHolder: undefined, readLockHolders: []});
    }

}

module.exports = Variable;