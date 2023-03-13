/* eslint-disable @typescript-eslint/no-explicit-any */
export const extractErrorMsg = (error: any): string => {
    const stringError = typeof error === "string" ?
        error :
        error.message ? JSON.stringify(error.message) :
            JSON.stringify(error);

    return stringError;
};