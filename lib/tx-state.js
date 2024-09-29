/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

/**
 * @enum
 */
const TxState = {
    UNDEFINED: 'UNDEFINED',
    STARTED: 'STARTED',
    PREPARED: 'PREPARED',
    COMMITTED: 'COMMITTED',
    ABORTED: 'ABORTED'
};


module.exports = TxState;