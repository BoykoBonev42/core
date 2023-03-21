import { Glue42WebPlatform } from "../../platform";
import { InterceptorEntry, InterceptorInquiry, InterceptorInquiryResult } from "../common/types";
import { interceptorRegistrationRequestDecoder, nonEmptyStringDecoder } from "../shared/decoders";

export class InterceptionController {
    private interceptions: Array<InterceptorEntry> = [];
    
    public shutdown(): void {
        this.interceptions = [];
    }

    public async registerInterceptor(request: Glue42WebPlatform.Plugins.InterceptorRegistrationRequest, registrantName: string): Promise<void> {

        interceptorRegistrationRequestDecoder.runWithException(request);
        nonEmptyStringDecoder.runWithException(registrantName);

        const collisions = request.interceptions.reduce<Array<{ domain: string, operation: string }>>((collisions, interception) => {
            const foundCollision = this.interceptions.some((registeredInterception) => registeredInterception.domain === interception.domain && registeredInterception.operation === interception.operation);

            if (foundCollision) {
                collisions.push({ domain: interception.domain, operation: interception.operation });
            }

            return collisions;
        }, []);

        if (collisions.length) {
            const collisionsAsString = collisions.map((collision) => `${collision.domain} - ${collision.operation}`).join(", ");

            throw new Error(`Interception registration is rejected, because the following collisions where found: ${collisionsAsString}`);
        }

        request.interceptions.forEach((interception) => {
            this.interceptions.push({
                domain: interception.domain,
                operation: interception.operation,
                callInterceptor: request.callInterceptor,
                registrantName
            });
        });
    }

    public getOperationInterceptor(inquiry: InterceptorInquiry): InterceptorInquiryResult | undefined {
        const foundEntry = this.interceptions.find((registeredInterception) => registeredInterception.domain === inquiry.domain && registeredInterception.operation === inquiry.operation);

        if (foundEntry) {
            return {
                name: foundEntry.registrantName,
                intercept: foundEntry.callInterceptor
            };
        }
    }
}
