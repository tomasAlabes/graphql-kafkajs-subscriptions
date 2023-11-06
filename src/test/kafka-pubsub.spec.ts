import { Kafka } from "./InMemoryKafka";
import { KafkaPubSub } from "../index";
import { KafkaMessage } from "kafkajs";

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

  it("should increment the id for each subscription", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    const id1 = await pubsub.subscribe(channel, onMessage);
    const id2 = await pubsub.subscribe(channel, onMessage);

    expect(id1).toBe(1);
    expect(id2).toBe(2);
  });

  it("should notify all subscriptions", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = Buffer.from(JSON.stringify({ data: 1 }));

    const onMessage = jest.fn((msg: KafkaMessage) => {});
    const onMessage2 = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    await pubsub.subscribe(channel, onMessage);
    await pubsub.subscribe(channel, onMessage2);

    await pubsub.publish(channel, payload);

    expect(onMessage).toBeCalled();
    expect(onMessage2).toBeCalled();
  });

  it("should unsubscribe the given subscription", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = Buffer.from(JSON.stringify({ data: 1 }));

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    const id = await pubsub.subscribe(channel, onMessage);

    pubsub.unsubscribe(id);
    await pubsub.publish(channel, payload);

    expect(onMessage).not.toBeCalled();
  });

  it("should only unsubscribe the given subscription", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = Buffer.from(JSON.stringify({ data: 1 }));

    const onMessage = jest.fn((msg: KafkaMessage) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    const id = await pubsub.subscribe(channel, onMessage);
    await pubsub.subscribe(channel, onMessage);

    pubsub.unsubscribe(id);
    await pubsub.publish(channel, payload);

    expect(onMessage).toBeCalledTimes(1);
  });
});
