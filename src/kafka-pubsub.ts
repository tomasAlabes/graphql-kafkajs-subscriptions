import { PubSubEngine } from 'graphql-subscriptions';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

export class KafkaPubSub implements PubSubEngine {
	private client: Kafka;
	private subscriptionMap: { [subId: number]: [string, Function] };
	private channelSubscriptions: { [channel: string]: number[] };
	private producer: Producer;
	private consumer: Consumer;
	private topic: string;

	constructor({ kafka, topic }: { kafka: Kafka; topic: string }) {
		this.client = kafka;
		this.subscriptionMap = {};
		this.channelSubscriptions = {};
		this.topic = topic;
		this.producer = this.client.producer();
		this.consumer = this.client.consumer({
			groupId: `pr-dt-collab-${Math.ceil(Math.random() * 9999)}`
		});

		this.createProducer();
		this.createConsumer(topic);
	}

	public async publish(channel: string, payload: any): Promise<void> {
		await this.producer.send({
			messages: [{value:Buffer.from(JSON.stringify({channel, ...payload}))}],
			topic: this.topic
		});
	}

	public async subscribe(channel: string, onMessage: Function, options?: any): Promise<number> {
		const index = Object.keys(this.subscriptionMap).length;
		this.subscriptionMap[index] = [channel, onMessage];
		this.channelSubscriptions[channel] = (this.channelSubscriptions[channel] || []).concat(
			index
		);
		return index;
	}
	
	public unsubscribe(index: number) {
		const [channel] = this.subscriptionMap[index];
		this.channelSubscriptions[channel] = this.channelSubscriptions[channel].filter(
			subId => subId !== index
		);
	}

	public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
		return new PubSubAsyncIterator<T>(this, triggers);
	}

	private onMessage(channel: string, message: any) {
		const subscriptions = this.channelSubscriptions[channel];
		if (!subscriptions) {
			return;
		} // no subscribers, don't publish msg
		for (const subId of subscriptions) {
			const [cnl, listener] = this.subscriptionMap[subId];
			listener(message);
		}
	}

	private async createProducer() {
		await this.producer.connect();
	}

	private async createConsumer(topic: string) {
		await this.consumer.connect();
		await this.consumer.subscribe({ topic });
		await this.consumer.run({
			eachMessage: async ({ message }) => {
				const parsedMessage = JSON.parse(message.value.toString());				
				// Using channel abstraction
				if (parsedMessage.channel) {
					const { channel, ...payload } = parsedMessage;
					this.onMessage(channel, payload);
				} else {
					// No channel abstraction, publish over the whole topic
					this.onMessage(topic, parsedMessage);
				}
			}
		});
	}
}
