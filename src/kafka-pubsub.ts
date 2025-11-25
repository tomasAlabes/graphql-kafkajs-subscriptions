import { PubSubEngine } from "graphql-subscriptions";
import {
  Consumer,
  Kafka,
  Producer,
  ProducerConfig,
  IHeaders,
  KafkaMessage,
  ConsumerConfig,
  ConsumerEvents,
  RemoveInstrumentationEventListener,
  ValueOf,
} from "kafkajs";
import { PubSubAsyncIterator } from "./pubsub-async-iterator";

interface KafkaPubSubInput {
  kafka: Kafka;
  topic: string;
  groupIdPrefix?: string;
  producerConfig?: ProducerConfig;
  consumerConfig?: Omit<ConsumerConfig, "groupId"> & { groupId?: string };
}

export type MessageHandler = (msg: KafkaMessage) => unknown;

interface SubscriptionsMap {
  [subId: number]: [string, MessageHandler];
}

export class KafkaPubSub implements PubSubEngine {
  private static consumerGroupIdCounter = 0;
  private client: Kafka;
  private subscriptionMap: SubscriptionsMap;
  private lastId = 0;
  private channelSubscriptions: { [channel: string]: Set<number> };
  private producer: Producer;
  private consumer: Consumer;
  private topic: string;

  public static async create({
    kafka,
    topic,
    groupIdPrefix,
    producerConfig = {},
    consumerConfig = {},
  }: KafkaPubSubInput): Promise<KafkaPubSub> {
    const pubsub = new KafkaPubSub({
      kafka,
      topic,
      groupIdPrefix,
      producerConfig,
      consumerConfig,
    });
    await pubsub.connectProducer();
    await pubsub.runConsumer(pubsub.topic);
    return pubsub;
  }

  private constructor({
    kafka,
    topic,
    groupIdPrefix,
    producerConfig,
    consumerConfig,
  }: KafkaPubSubInput) {
    this.client = kafka;
    this.subscriptionMap = {};
    this.channelSubscriptions = {};
    this.topic = topic;
    this.producer = this.client.producer(producerConfig);

    // Determine groupId: use consumerConfig.groupId if provided, otherwise generate from prefix
    let groupId: string;
    if (consumerConfig?.groupId) {
      groupId = consumerConfig.groupId;
    } else if (groupIdPrefix) {
      // we need all consumers listening to all messages
      groupId = `${groupIdPrefix}-${KafkaPubSub.consumerGroupIdCounter++}`;
    } else {
      throw new Error(
        "Either groupIdPrefix or consumerConfig.groupId must be provided"
      );
    }

    this.consumer = this.client.consumer({
      ...consumerConfig,
      groupId,
    });
  }

  /**
   *
   * @param channel to use for internal routing, besides topic
   * @param payload event to send
   * @param key the key of the event
   * @param headers optional kafkajs headers
   * @param sendOptions optional kafkajs producer.send options
   */
  public async publish(
    channel: string,
    payload: string | Buffer,
    headers?: IHeaders,
    sendOptions?: object,
    key?: string | Buffer
  ): Promise<void> {
    await this.producer.send({
      messages: [
        {
          value: payload,
          key,
          headers: {
            ...headers,
            channel,
          },
        },
      ],
      topic: this.topic,
      ...sendOptions,
    });
  }

  public async subscribe(
    channel: string,
    onMessage: MessageHandler,
    _?: unknown
  ): Promise<number> {
    this.lastId = this.lastId + 1;
    this.subscriptionMap[this.lastId] = [channel, onMessage];
    this.channelSubscriptions[channel] = (
      this.channelSubscriptions[channel] || new Set()
    ).add(this.lastId);
    return this.lastId;
  }

  public unsubscribe(index: number) {
    const subscription = this.subscriptionMap[index];
    if (!subscription) {
      return;
    }

    const [channel] = subscription;
    const subscriptions = this.channelSubscriptions[channel];
    this.channelSubscriptions[channel]?.delete(index);

    if (subscriptions && subscriptions.size === 0) {
      delete this.channelSubscriptions[channel];
    }

    delete this.subscriptionMap[index];
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, triggers);
  }

  /**
   * Register an event listener on the Kafka consumer.
   * This allows you to listen to consumer lifecycle events such as 'consumer.stop', 'consumer.crash', etc.
   *
   * @param eventName - The name of the consumer event to listen to
   * @param listener - The callback function to execute when the event is emitted
   * @returns A function to remove the event listener
   *
   * @example
   * ```typescript
   * // Listen to consumer crash events
   * pubsub.consumerOn('consumer.crash', (event) => {
   *   console.error('Consumer crashed:', event.payload.error);
   * });
   *
   * // Listen to consumer stop events
   * pubsub.consumerOn('consumer.stop', (event) => {
   *   console.log('Consumer stopped');
   * });
   * ```
   */
  public consumerOn(
    eventName: ValueOf<ConsumerEvents>,
    listener: (event: any) => void
  ): RemoveInstrumentationEventListener<typeof eventName> {
    return this.consumer.on(eventName, listener);
  }

  private onMessage(channel: string, message: KafkaMessage) {
    const subscriptions = this.channelSubscriptions[channel];
    if (!subscriptions) {
      return;
    } // no subscribers, don't publish msg
    subscriptions.forEach((subId) => {
      const subscription = this.subscriptionMap[subId];
      if (subscription) {
        const [_, listener] = subscription;
        listener(message);
      }
    });
  }

  private async connectProducer() {
    await this.producer.connect();
  }

  private async runConsumer(topic: string) {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        // Using channel abstraction
        if (message.headers?.channel) {
          this.onMessage(message.headers.channel as string, message);
        } else {
          // No channel abstraction, publish over the whole topic
          this.onMessage(topic, message);
        }
      },
    });
  }
}
