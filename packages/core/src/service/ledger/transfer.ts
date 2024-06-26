import { WalletState } from '../../entries/wallet';
import { TonRecipientData } from '../../entries/send';
import BigNumber from 'bignumber.js';
import {
    externalMessage,
    getTonkeeperQueryId,
    getTTL,
    seeIfTransferBounceable,
    SendMode
} from '../transfer/common';
import { Address, Cell } from '@ton/core';
import { getLedgerAccountPathByIndex } from './utils';
import { AuthLedger } from '../../entries/password';
import { walletContractFromState } from '../wallet/contractService';
import { AssetAmount } from '../../entries/crypto/asset/asset-amount';
import { TonAsset } from '../../entries/crypto/asset/ton-asset';
import { jettonTransferAmount, jettonTransferForwardAmount } from '../transfer/jettonService';
import { nftTransferForwardAmount } from '../transfer/nftService';
import { LedgerSigner } from '../../entries/signer';

export const createLedgerTonTransfer = async (
    timestamp: number,
    seqno: number,
    walletState: WalletState,
    recipient: TonRecipientData,
    weiAmount: BigNumber,
    isMax: boolean,
    signer: LedgerSigner
) => {
    const path = getLedgerAccountPathByIndex((walletState.auth as AuthLedger).accountIndex);
    const contract = walletContractFromState(walletState);

    const transfer = await signer(path, {
        to: Address.parse(recipient.toAccount.address),
        bounce: seeIfTransferBounceable(recipient.toAccount, recipient.address),
        amount: BigInt(weiAmount.toFixed(0)),
        seqno,
        timeout: getTTL(timestamp),
        sendMode: isMax
            ? SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.IGNORE_ERRORS
            : SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        payload: recipient.comment !== '' ? { type: 'comment', text: recipient.comment } : undefined
    });

    return externalMessage(contract, seqno, transfer).toBoc();
};

export const createLedgerJettonTransfer = async (
    timestamp: number,
    seqno: number,
    walletState: WalletState,
    recipientAddress: string,
    amount: AssetAmount<TonAsset>,
    jettonWalletAddress: string,
    forwardPayload: Cell | null,
    signer: LedgerSigner
) => {
    const jettonAmount = BigInt(amount.stringWeiAmount);
    const path = getLedgerAccountPathByIndex((walletState.auth as AuthLedger).accountIndex);
    const contract = walletContractFromState(walletState);

    const transfer = await signer(path, {
        to: Address.parse(jettonWalletAddress),
        bounce: true,
        amount: jettonTransferAmount,
        seqno,
        timeout: getTTL(timestamp),
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        payload: {
            type: 'jetton-transfer',
            queryId: getTonkeeperQueryId(),
            amount: jettonAmount,
            destination: Address.parse(recipientAddress),
            responseDestination: Address.parse(walletState.active.rawAddress),
            forwardAmount: jettonTransferForwardAmount,
            forwardPayload,
            customPayload: null
        }
    });

    return externalMessage(contract, seqno, transfer).toBoc();
};

export const createLedgerNftTransfer = async (
    timestamp: number,
    seqno: number,
    walletState: WalletState,
    recipientAddress: string,
    nftAddress: string,
    nftTransferAmount: bigint,
    forwardPayload: Cell | null,
    signer: LedgerSigner
) => {
    const path = getLedgerAccountPathByIndex((walletState.auth as AuthLedger).accountIndex);
    const contract = walletContractFromState(walletState);

    const transfer = await signer(path, {
        to: Address.parse(nftAddress),
        bounce: true,
        amount: nftTransferAmount,
        seqno,
        timeout: getTTL(timestamp),
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        payload: {
            type: 'nft-transfer',
            queryId: getTonkeeperQueryId(),
            newOwner: Address.parse(recipientAddress),
            responseDestination: Address.parse(walletState.active.rawAddress),
            forwardAmount: nftTransferForwardAmount,
            forwardPayload,
            customPayload: null
        }
    });

    return externalMessage(contract, seqno, transfer).toBoc();
};
