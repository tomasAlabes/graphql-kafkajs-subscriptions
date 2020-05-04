import { Kafka } from "./InMemoryKafka";
import { KafkaPubSub } from "../index";

describe("Test Suite", () => {
  it("should test basic pub sub", async () => {
    const topic = "mock_topic";
    const channel = "my_channel";
    const payload = { data: 1 };

    const onMessage = jest.fn((channel, msg) => {});

    const pubsub = await KafkaPubSub.create({
      groupIdPrefix: "my-prefix",
      kafka: new Kafka() as any,
      topic,
    });

    await pubsub.subscribe(channel, onMessage);
    await pubsub.publish(channel, payload);
    expect(onMessage).toBeCalled();
    expect(onMessage).toBeCalledWith(payload);
  });
});
