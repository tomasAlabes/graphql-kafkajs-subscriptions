# graphql-kafkajs-subscriptions

Apollo graphql subscriptions over Kafka, using [kafkajs](https://github.com/tulios/kafkajs). Inspired on [graphql-kafka-subscriptions](https://github.com/ancashoria/graphql-kafka-subscriptions).

There's one producer and one consumer for each node instance. Communication happens over a single kafka topic.

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

export const pubsub = new KafkaPubSub({
  topic: 'anything',
  kafka: new Kafka({/* ... */})
  globalConfig: {} // options passed directly to the consumer and producer
})
```

### Subscription Resolver

```javascript
{
    collaboration: {
      resolve: (payload: YourType) => {
        return payload;
      },
      subscribe: (_, args) => {
        return externalPubSub.asyncIterator<YourType>(yourChannel);
      }
    }
  };
```

### Publication

```javascript
pubsub.publish("my channel", {
  /* your event data */
});
```
