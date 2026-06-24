// Event-driven processing layer.
// A lightweight in-process event bus. Backend services publish domain
// events (e.g. "run.ingested") and subscribers react asynchronously —
// the evaluation engine scores runs and the alerting engine evaluates
// thresholds without the request path knowing about them.

import { EventEmitter } from 'node:events';

class EventBus extends EventEmitter {
  publish(type, payload) {
    // Defer to next tick to mimic async queue processing.
    setImmediate(() => this.emit(type, payload));
    setImmediate(() => this.emit('*', { type, payload }));
  }
}

export const bus = new EventBus();
bus.setMaxListeners(50);

export const EVENTS = {
  RUN_INGESTED: 'run.ingested',
  RUN_EVALUATED: 'run.evaluated',
  ALERT_RAISED: 'alert.raised',
  CONFIG_CHANGED: 'config.changed',
};
