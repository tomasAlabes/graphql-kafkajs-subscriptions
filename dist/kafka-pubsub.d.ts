import { PubSubEngine } from 'graphql-subscriptions';
import { Kafka } from 'kafkajs';
export declare class KafkaPubSub implements PubSubEngine {
    private client;
    private subscriptionMap;
    private channelSubscriptions;
    private producer;
    private consumer;
    private topic;
    constructor({ kafka, topic }: {
        kafka: Kafka;
        topic: string;
    });
    publish(channel: string, payload: any): Promise<void>;
    subscribe(channel: string, onMessage: Function, options?: any): Promise<number>;
    unsubscribe(index: number): void;
    asyncIterator<T>(triggers: string | string[]): AsyncIterator<T>;
    private onMessage;
    private createProducer;
    private createConsumer;
}
