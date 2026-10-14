const registry = new Map();

class RoleFactory {
    static register(name, RoleClass) {
        registry.set(name, RoleClass);
    }

    static unregister(name) {
        registry.delete(name);
    }

    static names() {
        return [...registry.keys()];
    }

    static selfRegistrableNames() {
        return [...registry.entries()]
            .filter(([, RoleClass]) => new RoleClass().selfRegistrable)
            .map(([name]) => name);
    }

    // FACTORY METHOD: callers get a Role object and never compare role strings
    static create(name) {
        const RoleClass = registry.get(name);
        return RoleClass ? new RoleClass() : null;
    }
}

RoleFactory.register('admin', require('./AdminRole'));
RoleFactory.register('reporter', require('./ReporterRole'));
RoleFactory.register('developer', require('./DeveloperRole'));

module.exports = RoleFactory;
