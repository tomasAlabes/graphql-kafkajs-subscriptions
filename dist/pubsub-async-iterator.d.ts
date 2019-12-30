import { PubSubEngine } from 'graphql-subscriptions';
export declare class PubSubAsyncIterator<T> implements AsyncIterator<T> {
    constructor(pubsub: PubSubEngine, eventNames: string | string[], options?: Object);
    next(): Promise<IteratorResult<any, any>>;
    return(): Promise<{
        value: any;
        done: boolean;
    }>;
    throw(error: any): Promise<never>;
    private pullQueue;
    private pushQueue;
    private eventsArray;
    private subscriptionIds;
    private listening;
    private pubsub;
    private options;
    private pushValue;
    private pullValue;
    private emptyQueue;
    private subscribeAll;
    private unsubscribeAll;
}
