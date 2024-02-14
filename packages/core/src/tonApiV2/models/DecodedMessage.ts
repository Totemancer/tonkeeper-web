/* tslint:disable */
/* eslint-disable */
/**
 * REST api to TON blockchain explorer
 * Provide access to indexed TON blockchain
 *
 * The version of the OpenAPI document: 2.0.0
 * Contact: support@tonkeeper.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { AccountAddress } from './AccountAddress';
import {
    AccountAddressFromJSON,
    AccountAddressFromJSONTyped,
    AccountAddressToJSON,
} from './AccountAddress';
import type { DecodedMessageExtInMsgDecoded } from './DecodedMessageExtInMsgDecoded';
import {
    DecodedMessageExtInMsgDecodedFromJSON,
    DecodedMessageExtInMsgDecodedFromJSONTyped,
    DecodedMessageExtInMsgDecodedToJSON,
} from './DecodedMessageExtInMsgDecoded';

/**
 * 
 * @export
 * @interface DecodedMessage
 */
export interface DecodedMessage {
    /**
     * 
     * @type {AccountAddress}
     * @memberof DecodedMessage
     */
    destination: AccountAddress;
    /**
     * 
     * @type {string}
     * @memberof DecodedMessage
     */
    destinationWalletVersion: string;
    /**
     * 
     * @type {DecodedMessageExtInMsgDecoded}
     * @memberof DecodedMessage
     */
    extInMsgDecoded?: DecodedMessageExtInMsgDecoded;
}

/**
 * Check if a given object implements the DecodedMessage interface.
 */
export function instanceOfDecodedMessage(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "destination" in value;
    isInstance = isInstance && "destinationWalletVersion" in value;

    return isInstance;
}

export function DecodedMessageFromJSON(json: any): DecodedMessage {
    return DecodedMessageFromJSONTyped(json, false);
}

export function DecodedMessageFromJSONTyped(json: any, ignoreDiscriminator: boolean): DecodedMessage {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'destination': AccountAddressFromJSON(json['destination']),
        'destinationWalletVersion': json['destination_wallet_version'],
        'extInMsgDecoded': !exists(json, 'ext_in_msg_decoded') ? undefined : DecodedMessageExtInMsgDecodedFromJSON(json['ext_in_msg_decoded']),
    };
}

export function DecodedMessageToJSON(value?: DecodedMessage | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'destination': AccountAddressToJSON(value.destination),
        'destination_wallet_version': value.destinationWalletVersion,
        'ext_in_msg_decoded': DecodedMessageExtInMsgDecodedToJSON(value.extInMsgDecoded),
    };
}
