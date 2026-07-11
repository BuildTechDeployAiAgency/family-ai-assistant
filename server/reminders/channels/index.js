// Reminder delivery channel registry. Each channel exports
// send(reminder, user, task) — add new channels (telegram, email) here.
import * as push from './push.js';
import * as call from './call.js';

const channels = { push, call };

export function getChannel(name) {
  return channels[name] || channels.push;
}
