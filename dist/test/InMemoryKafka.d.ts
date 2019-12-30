export declare class Producer {
    private sendCb;
    constructor({ sendCb }: any);
    connect(): Promise<void>;
    send({ topic, messages }: any): Promise<void>;
    disconnect(): Promise<void>;
}
declare class Consumer {
    private groupId;
    private subscribeCb;
    eachMessage: any;
    constructor({ groupId, subscribeCb }: any);
    getGroupId(): string;
    connect(): Promise<void>;
    subscribe({ topic }: any): Promise<void>;
    run({ eachMessage }: {
        eachMessage: (message: any) => void;
    }): Promise<void>;
    disconnect(): Promise<void>;
}
export default class Kafka {
    private topics;
    constructor();
    producer(): Producer;
    consumer({ groupId }: any): Consumer;
    private _subscribeCb;
    private _sendCb;
}
export {};
