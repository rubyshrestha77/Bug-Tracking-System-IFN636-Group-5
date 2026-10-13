const { BugState } = require('./BugState');

class ClosedState extends BugState {
    constructor() { super('Closed'); }

    allowsTransitionTo() {
        return false;
    }

    refusalMessage() {
        return 'This bug is closed and can no longer be changed';
    }
}

module.exports = ClosedState;