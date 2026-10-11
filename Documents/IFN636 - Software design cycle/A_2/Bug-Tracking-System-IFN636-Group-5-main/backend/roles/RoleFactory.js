const registry = new Map();

class RoleFactory {
  static register(name, RoleClass) { registry.set(name, RoleClass); }
  static unregister(name) { registry.delete(name); }
  static names() { return [...registry.keys()]; }
  static create(name) {
    const RoleClass = registry.get(name);
    return RoleClass ? new RoleClass() : null;
  }
}

RoleFactory.register('Admin', require('./AdminRole'));
RoleFactory.register('Reporter', require('./ReporterRole'));
RoleFactory.register('Developer', require('./DeveloperRole'));

module.exports = RoleFactory;