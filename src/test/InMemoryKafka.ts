// copied from: https://github.com/Wei-Zou/jest-mock-kafkajs/blob/master/__mocks__/kafkajs.js

import { EventEmitter } from "events";

export class Producer {
  private sendCb: any;
  constructor({ sendCb }: any) {
    this.sendCb = sendCb;
  }

  public async connect() {
    return Promise.resolve();
  }

  public async send({ topic, messages }: any) {
    this.sendCb({ topic, messages });
  }

  public async disconnect() {
    return Promise.resolve();
  }
}

class Consumer extends EventEmitter {
  private groupId: string;
  private subscribeCb: any;
  eachMessage: any;
  events = {
    FETCH_START: "consumer.fetch_start",
  };

  constructor({ groupId, subscribeCb, onConsumerCreated }: any) {
    super();
    this.groupId = groupId;
    this.subscribeCb = subscribeCb;
    onConsumerCreated?.(this);
  }

  public getGroupId() {
    return this.groupId;
  }

  public async connect() {
    return Promise.resolve();
  }

  public async subscribe({ topic }: any) {
    this.subscribeCb(topic, this);
  }

  public async run({ eachMessage }: { eachMessage: (message: any) => void }) {
    this.emit(this.events.FETCH_START, {});
    this.eachMessage = eachMessage;
  }

  public async disconnect() {
    return Promise.resolve();
  }
}

export class Kafka {
  private topics: { [key: string]: { [key: string]: Consumer[] } };
  private onConsumerCreated: (consumer: Consumer) => void;

  constructor(onConsumerCreated?: (consumer: Consumer) => void) {
    this.topics = {};
    this.onConsumerCreated = onConsumerCreated;
  }

  public producer() {
    return new Producer({
      sendCb: this._sendCb.bind(this),
    });
  }

  public consumer({ groupId }: any) {
    return new Consumer({
      groupId,
      subscribeCb: this._subscribeCb.bind(this),
      onConsumerCreated: this.onConsumerCreated,
    });
  }

  private _subscribeCb(topic: string, consumer: Consumer) {
    this.topics[topic] = this.topics[topic] || {};
    const topicObj = this.topics[topic];
    topicObj[consumer.getGroupId()] = topicObj[consumer.getGroupId()] || [];
    topicObj[consumer.getGroupId()].push(consumer);
  }

  private _sendCb({ topic, messages }: any) {
    messages.forEach((message: any) => {
      Object.values(this.topics[topic]).forEach((consumers: Consumer[]) => {
        const consumerToGetMessage = Math.floor(
          Math.random() * consumers.length
        );
        consumers[consumerToGetMessage].eachMessage({
          message,
        });
      });
    });
  }
}
