const { publisher } = require('./BugEventPublisher');
const ActivityLogger = require('./ActivityLogger');

let registered = false;
function registerObservers() {
  if (registered) return;
  publisher.subscribe(new ActivityLogger());
  registered = true;
}
module.exports = registerObservers;