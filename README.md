# graphql-kafkajs-subscriptions

Apollo graphql subscriptions over Kafka, using [kafkajs](https://github.com/tulios/kafkajs). Inspired on [graphql-kafka-subscriptions](https://github.com/ancashoria/graphql-kafka-subscriptions).

Communication is done through 1 kafka topic specified in the `KafkaPubSub` `create` function. Then
channels are used to identify the right subscription.

## Installation

```shell
  npm install graphql-kafkajs-subscriptions
```

```shell
  yarn add graphql-kafkajs-subscriptions
```

## Usage

### Kafka Pub Sub

```javascript
import { Kafka } from 'kafkajs';
import { KafkaPubSub } from 'graphql-kafkajs-subscriptions'

export const pubsub = KafkaPubSub.create({
  topic: 'my-topic',
  kafka: new Kafka({/* ... */})
  groupIdPrefix: "my-group-id-prefix", // used for kafka pub/sub,
  producerConfig: {}, // optional kafkajs producer configuration
  consumerConfig: {} // optional kafkajs consumer configuration
  resolveChannelFromMessage: () => "my channel" // optional function to resolve the channel from the message, by default message.headers.channel will be used
})
```

### Subscription Resolver

```javascript
{
    collaboration: {
      resolve: (payload: KafkaMessage) => {
        // payload.value will be whatever you sent
        return payload.value;
      },
      subscribe: (_, args) => {
        return pubsub.asyncIterator<YourType>("my channel");
      }
    }
  };
```

You can also use the subscription payload for the channel.

```javascript
{
    collaboration: {
      resolve: (payload: KafkaMessage) => {
        // what you publish will end up passing through here and to the client
        return payload.value;
      },
      subscribe: (_, args) => {
        // this is called from the client
        return pubsub.asyncIterator<YourType>(`channel-${args.myId}`);
      }
    }
  };
```

### Publication

Somewhere in your code, you call this:

```javascript
pubsub.publish("my channel", {
  /* your event data */
});
```

Use the rest of the kafkajs options:

```javascript
const event = {
  /* ... */
};
const headers = {
  header1: "value",
};
const producerOptions = {
  /* options from kafka.js.org/docs/producing: acks, timeout, etc */
};

pubsub.publish("my channel", event, headers, producerOptions);
```

This ends up publishing the event to kafka (to the topic you used to create the `kafkaPubSub`)
and received by all consumers. The consumer which is listening to `my channel` will send it
to the client.
