class LastAdminError extends Error {
    constructor() {
        super('Cannot deactivate the last active admin');
        this.name = 'LastAdminError';
        this.status = 409;
    }
}

// Pure function: no database access, so it is easy to test.
function assertNotLastActiveAdmin(target, activeAdminCount, nextIsActive) {
    const deactivatingAnActiveAdmin =
        target.role === 'admin' && target.isActive !== false && nextIsActive === false;

    if (deactivatingAnActiveAdmin && activeAdminCount <= 1) {
        throw new LastAdminError();
    }
}

module.exports = { assertNotLastActiveAdmin, LastAdminError };
