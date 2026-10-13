class Observer {
  update(event) {
    throw new Error(`${this.constructor.name} must implement update(event)`);
  }
}
module.exports = Observer;