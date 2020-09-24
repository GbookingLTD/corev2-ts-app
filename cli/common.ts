import * as GBookingCoreV2 from 'corev2-schemata/langs/typescript/GBookingCoreV2';
import {MedMeAPI} from "corev2-ts-sdk/lib/api";

export function handleError(err: any) {
    if (err.isRpcError)
        return console.error("rpc error %s %s", err.error.code, err.error.message);

    console.error("common error %s", err.message, err.stack);
}

export function handleTtyError(error) {
    if(error.isTtyError) {
        throw "Prompt couldn't be rendered in the current environment";
    }

    console.error("error %s\n", error.message, error.stack);
}

export function getBusinessByIdAction(businessId): Promise<void|GBookingCoreV2.BusinessClass> {
    return MedMeAPI.business.getBusinessById(businessId)
        .catch(handleError);
}

export function getNetworkBusinessListAction(networkId: number): Promise<void|GBookingCoreV2.BusinessRefInNetwork[]> {
    return MedMeAPI.business.getNetworkBusinessList(networkId)
        .catch(handleError);
}

