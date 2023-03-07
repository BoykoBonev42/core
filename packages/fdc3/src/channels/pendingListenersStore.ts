import { ContextHandler, Listener } from "@finos/fdc3";
import { nanoid } from "nanoid";
import { AddContextListenerConfig } from "../types/fdc3Types";
import { UnsubscribeFunction } from "../types/glue42Types";

interface PendingListener {
    id: string;
    handler: ContextHandler;
    contextType?: string;
    listener: Listener;
    setActualUnsub(unsub: UnsubscribeFunction): void;
}

export class ChannelsPendingListenersStore {
    private pendingListeners: PendingListener[] = [];

    public createPendingListener(handler: ContextHandler, contextType?: string): Listener {
        const id = nanoid();

        const unsubscribe = () => {
            this.pendingListeners = this.pendingListeners.filter(listener => listener.id !== id);
        };

        const listener = { unsubscribe };

        const setActualUnsub = (actualUnsub: UnsubscribeFunction) => {
            listener.unsubscribe = actualUnsub;
        };

        this.pendingListeners.push({ id, handler, contextType, setActualUnsub, listener });

        return listener;
    }

    public async subscribePendingListeners(commandId: string, addContextListenerFn: ({ commandId, handler, contextType, channelId }: AddContextListenerConfig ) => Promise<Listener>, channelId: string) {
        const listeners = await Promise.all(this.pendingListeners.map(pendingListener => {
            const { handler, contextType } = pendingListener;

            return addContextListenerFn({ commandId, handler, contextType, channelId });
        }));

        Object.values(this.pendingListeners).forEach(({ setActualUnsub }, index) => setActualUnsub(listeners[index].unsubscribe));
    }

    public unsubscribePendingListeners(): void {
        this.pendingListeners.forEach(({ listener, id, setActualUnsub }) => {
            listener.unsubscribe();

            const newUnsub = () => {
                this.pendingListeners = this.pendingListeners.filter(listener => listener.id !== id);
            };

            setActualUnsub(newUnsub);
        });
    }
}
