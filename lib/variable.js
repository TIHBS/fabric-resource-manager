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

    getName() {
        return this.theName;
    }

    setName(newName)  {
        this.theName = newName;
    }
    

    getValue() {
        return this.value;
    }

    setValue(newValue) {
        this.value = this.value;
    }

    getBeforeImage() {
        return this.beforeImage;
    }

    setBeforeImage(newBeforeImage) {
        this.beforeImage = newBeforeImage;
    }

    getWriteLockHolder() {
        return this.writeLockHolder;
    }

    setWriteLockHolder(newWriteLockHolder) {
        this.writeLockHolder = newWriteLockHolder;
    }

    getReadLockHolders() {
        return this.readLockHolders;
    }

    static fromBuffer(buffer) {
        return new Variable(State.deserialize(buffer));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to a variable object
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return new Variable(State.deserializeClass(data));
    }

    /**
     * Factory method to create a variable object
     */
    static createInstance(name, value) {
        return new Variable({ name: name, value: value, beforeImage: undefined, writeLockHolder: undefined, readLockHolders: new Map()});
    }

    static getClass() {
        return 'variable';
    }

}

module.exports = Variable;