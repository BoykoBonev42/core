import { GlueEventsController } from '../controllers/glueEvents';
import { GlueController } from '../controllers/glue';
import { GLUE42_EVENT_NAME, START, REQUEST_GLUE_RESPONSE } from './constants';
import { EventDispatcher } from './dispatcher';

export class EventReceiver {
    private glueResponseReceived: boolean = false;
    private glueInitialized: boolean = false;

    private readonly events: { [key in string]: { name: string; handle: (data: any) => void | Promise<void> } } = {
        "start": { name: START, handle: this.handleStart.bind(this) },
        "requestGlueResponse": { name: REQUEST_GLUE_RESPONSE, handle: this.handleRequestGlueResponse.bind(this) }
    }

    constructor(
        private readonly glueController: GlueController,
        private readonly eventDispatcher: EventDispatcher,
        private readonly eventsController: GlueEventsController,
    ) { }

    public start(): void {
        this.wireCustomEventListener();

        this.eventDispatcher.fireNotifyStarted();
    }

    private wireCustomEventListener(): void {
        window.addEventListener(GLUE42_EVENT_NAME, (event: any) => {
            const data = event.detail;

            if (!data || !data.glue42) {
                return;
            }
        
            const glue42Event = data.glue42.event;
            
            const foundHandler = this.events[glue42Event];

            if (!foundHandler) {
                return;
            }

            foundHandler.handle(data.glue42.message);
        });
    }

    private handleStart(): void {
        this.eventDispatcher.fireRequestGlue();
    }

    private async handleRequestGlueResponse(data: any): Promise<void> {
        if (this.glueResponseReceived && this.glueInitialized) {
            return;
        }

        this.glueResponseReceived = true;

        const { glue } = data;

        const glueValidator = this.glueController.validateGlue(glue);

        if (!glueValidator.isValid) {
            return this.glueController.initializeFailed(glueValidator.error);
        }

        this.glueController.initialize(glue);
        
        await this.eventsController.initialize();

        this.eventDispatcher.fireFdc3Ready();

        this.glueInitialized = true;
    }
}
