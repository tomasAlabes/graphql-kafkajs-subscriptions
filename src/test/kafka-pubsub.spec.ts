import { Kafka } from "./InMemoryKafka";
import { KafkaPubSub } from "../index";
import { Consumer, InstrumentationEvent, KafkaMessage } from "kafkajs";
import { EventEmitter } from "stream";

describe("Test Suite", () => {
  it("should test basic pub sub with buffer payload", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = Buffer.from(JSON.stringify({ data: 1 }));

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    await pubsub.subscribe(channel, onMessage);
    await pubsub.publish(channel, payload);
    expect(onMessage).toBeCalled();
    expect(onMessage).toBeCalledWith({
      value: payload,
      headers: { channel },
    });
  });
  it("should test basic pub sub with stringified payload", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = JSON.stringify({ data: 1 });

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    await pubsub.subscribe(channel, onMessage);
    await pubsub.publish(channel, payload);
    expect(onMessage).toBeCalled();
    expect(onMessage).toBeCalledWith({
      value: payload,
      headers: { channel },
    });
  });
  it("should test basic pub sub with custom headers", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = JSON.stringify({ data: 1 });

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    await pubsub.subscribe(channel, onMessage);

    const headers = { custom: "header" };
    await pubsub.publish(channel, payload, headers);
    expect(onMessage).toBeCalled();
    expect(onMessage).toBeCalledWith({
      value: payload,
      headers: {
        ...headers,
        channel,
      },
    });
  });
  it("should test basic pub sub with custom key", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = JSON.stringify({ data: 1 });
    const key = "test-key";

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    await pubsub.subscribe(channel, onMessage);

    await pubsub.publish(channel, payload, undefined, undefined, key);
    expect(onMessage).toBeCalled();
    expect(onMessage).toBeCalledWith({
      value: payload,
      key,
      headers: {
        channel,
      },
    });
  });
  it("should test basic pub sub with attached consumer events", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = Buffer.from(JSON.stringify({ data: 1 }));

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    let consumer: EventEmitter;
    const onOnConsumerCreated = (c: any) => {
      consumer = c;
    };

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka(onOnConsumerCreated) as any,
      topic,
    });

    const eventFn = jest.fn((event: InstrumentationEvent<unknown>) => {});
    pubsub.consumerOn("consumer.fetch_start", eventFn);

    // Fake a fetch start
    consumer.emit("consumer.fetch_start", {});

    await pubsub.subscribe(channel, onMessage);
    await pubsub.publish(channel, payload);
    expect(onMessage).toBeCalled();
    expect(onMessage).toBeCalledWith({
      value: payload,
      headers: { channel },
    });
    expect(eventFn).toBeCalled();
  });
});
