class Subject {
  #observers = [];

  subscribe(observer) {
    if (!observer || typeof observer.update !== 'function') {
      throw new Error('Observer must implement update(event)');
    }
    if (!this.#observers.includes(observer)) this.#observers.push(observer);
  }

  unsubscribe(observer) {
    this.#observers = this.#observers.filter((o) => o !== observer);
  }

  async notify(event) {
    for (const observer of [...this.#observers]) {
      try {
        await observer.update(event);
      } catch (err) {
        console.error(`Observer ${observer.constructor.name} failed:`, err.message);
      }
    }
  }
}
module.exports = Subject;