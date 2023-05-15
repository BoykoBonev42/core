import { ContextHandler, Listener } from "@finos/fdc3";
import { nanoid } from "nanoid";
import { AddContextListenerConfig } from "../types/fdc3Types";
import { UnsubscribeFunction } from "../types/glue42Types";

interface PendingListener {
    id: string;
    handler: ContextHandler;
    contextType?: string;
    listener: Listener;
    unsubWithoutFilter(): void;
    setActualUnsub(unsub: UnsubscribeFunction): void;
}

export class ChannelsPendingListenersStore {
    private pendingListeners: PendingListener[] = [];

    public createPendingListener(handler: ContextHandler, contextType?: string): Listener {
        const id = nanoid();

        const unsubscribe = () => this.filterPendingListenersById(id);

        const listener = { unsubscribe };

        const setActualUnsub = (actualUnsub: UnsubscribeFunction) => {
            listener.unsubscribe = actualUnsub;
        };

        this.pendingListeners.push({ id, handler, contextType, setActualUnsub, listener, unsubWithoutFilter: () => {} });

        return listener;
    }

    public async subscribePendingListeners(commandId: string, addContextListenerFn: ({ commandId, handler, contextType, channelId }: AddContextListenerConfig ) => Promise<Listener>, channelId: string) {
        const listeners = await Promise.all(this.pendingListeners.map(pendingListener => {
            const { handler, contextType } = pendingListener;

            return addContextListenerFn({ commandId, handler, contextType, channelId });
        }));

        Object.values(this.pendingListeners).forEach(({ id, setActualUnsub, unsubWithoutFilter }, index) => {
            unsubWithoutFilter = listeners[index].unsubscribe;

            const un = () => {
                this.filterPendingListenersById(id);

                unsubWithoutFilter();
            };

            setActualUnsub(un);
        });
    }

    public unsubscribePendingListeners(): void {       
        this.pendingListeners.forEach(({ id, setActualUnsub, unsubWithoutFilter }) => {
            unsubWithoutFilter();

            const newUnsub = () => this.filterPendingListenersById(id);

            setActualUnsub(newUnsub);
        });
    }

    private filterPendingListenersById(id: string) {
        this.pendingListeners = this.pendingListeners.filter((listener) => listener.id !== id);
    }
}
