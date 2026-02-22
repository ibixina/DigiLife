// EventBus.ts
type EventCallback = (payload: any) => void;

export class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    on(event: string, callback: EventCallback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        return () => this.off(event, callback);
    }

    off(event: string, callback: EventCallback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    emit(event: string, payload?: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((cb) => cb(payload));
        }
    }
}

export const events = new EventBus();
