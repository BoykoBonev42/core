/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription } from "./glue";
import { FrameStreamData, WorkspaceStreamData, ContainerStreamData, WindowStreamData } from "./protocol";

export type WorkspaceEventType = "frame" | "workspace" | "container" | "window";
export type WorkspaceEventScope = "global" | "frame" | "workspace" | "container" | "window";
export type WorkspaceEventAction = "opened" | "closing" | "closed" | "focus" | "added" | "loaded" | "removed" | "childrenUpdate" | "containerChange" | "maximized" | "restored" | "minimized" | "normal" | "selected" | "lock-configuration-changed"| "hibernated"|"resumed";
export type WorkspacePayload = FrameStreamData | WorkspaceStreamData | ContainerStreamData | WindowStreamData;

export interface SubscriptionConfig {
    eventType: WorkspaceEventType;
    scope: WorkspaceEventScope;
    action: WorkspaceEventAction;
    callback: (args?: any) => void;
    scopeId?: string;
}

export interface ActiveSubscription {
    streamType: WorkspaceEventType;
    level: WorkspaceEventScope;
    levelId?: string;
    callbacksCount: number;
    gdSub: Subscription;
}

export interface PendingSubscription {
    streamType: WorkspaceEventType;
    level: WorkspaceEventScope;
    levelId?: string;
    promise: Promise<void>;
}
