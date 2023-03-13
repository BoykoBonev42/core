import { Glue42Search } from "../../search";
import { LimitTestResult, ProviderQueryLimit, ProviderQueryResultCommand, QueryProviderResultsTracker } from "../shared/types";



// important to work in O(1)
export class LimitsTracker {
    private readonly limitsLookup: { [key in string]: { [key in string]: QueryProviderResultsTracker } } = {};
    private readonly limitsData: { [key in string]: ProviderQueryLimit } = {};

    public enableTracking(limits: Glue42Search.ProviderLimits, queryId: string): void {
        this.limitsLookup[queryId] = {};
        this.limitsData[queryId] = {
            maxResults: limits.maxResults ? limits.maxResults : Number.MAX_SAFE_INTEGER,
            maxResultsPerType: limits.maxResultsPerType ? limits.maxResultsPerType : Number.MAX_SAFE_INTEGER
        };
    }

    public testResultLimit(command: ProviderQueryResultCommand): LimitTestResult | undefined {
        const foundLookup = this.limitsLookup[command.identification.queryId];
        const limitData = this.limitsData[command.identification.queryId];

        if (!foundLookup || !limitData) {
            return;
        }

        let providerStateLookup = foundLookup[command.identification.providerId];

        if (!providerStateLookup) {
            providerStateLookup = { total: 0 };
            foundLookup[command.identification.providerId] = providerStateLookup;
        }

        providerStateLookup.total = ++providerStateLookup.total;

        if (providerStateLookup.total > limitData.maxResults) {
            return { maxLimitHit: true };
        }

        const resultTypeName = command.result.type.name;

        providerStateLookup[resultTypeName] = providerStateLookup[resultTypeName] ? ++providerStateLookup[resultTypeName] : 1;

        if (providerStateLookup[resultTypeName] > limitData.maxResultsPerType) {
            return { maxLimitPerTypeHit: true };
        }

    }

    public cleanTracking(queryId: string): void {
        delete this.limitsLookup[queryId];
        delete this.limitsData[queryId];
    }
}