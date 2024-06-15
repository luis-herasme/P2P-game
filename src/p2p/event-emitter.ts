type Fn = (body: any) => void;

export class EventEmitter {
  private listeners: Map<string, { fn: Fn; once: boolean }[]> = new Map();

  on(eventName: string, fn: Fn, once: boolean = false) {
    const listeners = this.listeners.get(eventName);

    if (listeners) {
      listeners.push({ fn, once });
    } else {
      this.listeners.set(eventName, [{ fn, once }]);
    }
  }

  once(eventName: string, fn: Fn) {
    this.on(eventName, fn, true);
  }

  emit(eventName: string, json: any) {
    const listeners = this.listeners.get(eventName);

    if (!listeners) {
      return;
    }

    for (const litener of listeners) {
      litener.fn(json);

      if (litener.once) {
        this.off(eventName, litener.fn);
      }
    }
  }

  off(event: string, fn: Function) {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    this.listeners.set(
      event,
      listeners.filter((f) => f.fn != fn)
    );
  }
}
