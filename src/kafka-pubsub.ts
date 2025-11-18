import { PubSubEngine } from "graphql-subscriptions";
import {
  Consumer,
  Kafka,
  Producer,
  ProducerConfig,
  IHeaders,
  KafkaMessage,
  ConsumerConfig,
} from "kafkajs";
import { PubSubAsyncIterator } from "./pubsub-async-iterator";

interface KafkaPubSubInput {
  kafka: Kafka;
  topic: string;
  groupIdPrefix?: string;
  producerConfig?: ProducerConfig;
  consumerConfig?: Omit<ConsumerConfig, "groupId"> & { groupId?: string };
}

export type MessageHandler = (msg: KafkaMessage) => any;

interface SubscriptionsMap {
  [subId: number]: [string, MessageHandler];
}

export class KafkaPubSub implements PubSubEngine {
  private client: Kafka;
  private subscriptionMap: SubscriptionsMap;
  private channelSubscriptions: { [channel: string]: number[] };
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
      groupId = `${groupIdPrefix}-${Math.ceil(Math.random() * 9999)}`;
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
    _?: any
  ): Promise<number> {
    const index = Object.keys(this.subscriptionMap).length;
    this.subscriptionMap[index] = [channel, onMessage];
    this.channelSubscriptions[channel] = (
      this.channelSubscriptions[channel] || []
    ).concat(index);
    return index;
  }

  public unsubscribe(index: number) {
    const [channel] = this.subscriptionMap[index];
    this.channelSubscriptions[channel] = this.channelSubscriptions[
      channel
    ].filter((subId) => subId !== index);
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, triggers);
  }

  private onMessage(channel: string, message: KafkaMessage) {
    const subscriptions = this.channelSubscriptions[channel];
    if (!subscriptions) {
      return;
    } // no subscribers, don't publish msg
    for (const subId of subscriptions) {
      const [cnl, listener] = this.subscriptionMap[subId];
      listener(message);
    }
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
