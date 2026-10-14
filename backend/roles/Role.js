class Role {
    constructor(name) {
        if (new.target === Role) {
            throw new Error('Role is abstract and cannot be instantiated');
        }
        this.name = name;
    }

    // Overridden to true by roles that users may pick at registration
    get selfRegistrable() {
        return false;
    }

    // TEMPLATE METHOD: the permission check algorithm is fixed here.
    // Steps 1 and 2 are shared by every role; step 3 is the hook subclasses override.
    can(user, permission) {
        if (!this.isAccountUsable(user)) return false; // step 1: account must exist and be active
        if (user.role !== this.name) return false;     // step 2: user must actually hold this role
        return this.hasPermission(permission);         // step 3: role-specific rule (polymorphic)
    }

    isAccountUsable(user) {
        return Boolean(user) && user.isActive !== false;
    }

    // HOOK: must be overridden
    hasPermission() {
        throw new Error('hasPermission() must be overridden by a concrete role');
    }
}

module.exports = Role;
