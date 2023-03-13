/* eslint-disable @typescript-eslint/no-explicit-any */
export class AsyncSequelizer {

    private readonly queue: Array<{ action: () => Promise<any>; resolve: (args?: any) => void; reject: (err?: any) => void }> = [];
    private isExecutingQueue = false;

    constructor(private readonly minSequenceInterval: number = 0) { }

    public enqueue<T>(action: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ action, resolve, reject });
            this.executeQueue();
        });
    }

    private async executeQueue(): Promise<void> {
        if (this.isExecutingQueue) {
            return;
        }

        this.isExecutingQueue = true;

        while (this.queue.length) {
            const operation = this.queue.shift();

            // this satisfies the strict typescript mode
            if (!operation) {
                this.isExecutingQueue = false;
                return;
            }

            try {
                const actionResult = await operation.action();
                operation.resolve(actionResult);
            } catch (error) {
                operation.reject(error);
            }

            await this.intervalBreak();
        }

        this.isExecutingQueue = false;
    }

    private intervalBreak(): Promise<void> {
        return new Promise((res) => setTimeout(res, this.minSequenceInterval));
    }
}
