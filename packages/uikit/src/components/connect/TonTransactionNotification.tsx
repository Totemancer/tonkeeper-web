import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TonConnectTransactionPayload } from '@tonkeeper/core/dist/entries/tonConnect';
import {
    ConnectTransferError,
    EstimateData,
    estimateTonConnectTransfer,
    sendTonConnectTransfer,
    tonConnectTransferError
} from '@tonkeeper/core/dist/service/transfer/tonService';
import { toShortValue } from '@tonkeeper/core/dist/utils/common';
import { FC, useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { useAppContext, useWalletContext } from '../../hooks/appContext';
import { useAppSdk } from '../../hooks/appSdk';
import { useTranslation } from '../../hooks/translation';
import { TxConfirmationCustomError } from '../../libs/errors/TxConfirmationCustomError';
import { QueryKey } from '../../libs/queryKey';
import { getSigner } from '../../state/mnemonic';
import { useCheckTouchId } from '../../state/password';
import { CheckmarkCircleIcon, ErrorIcon } from '../Icon';
import {
    Notification,
    NotificationBlock,
    NotificationFooter,
    NotificationFooterPortal,
    NotificationHeader,
    NotificationHeaderPortal,
    NotificationTitleRow
} from '../Notification';
import { SkeletonList } from '../Skeleton';
import { Body2, H2, Label2 } from '../Text';
import { Button } from '../fields/Button';
import { WalletEmoji } from '../shared/emoji/WalletEmoji';
import { ResultButton } from '../transfer/common';
import { EmulationList } from './EstimationLayout';

const ButtonGap = styled.div`
    ${props =>
        props.theme.displayType === 'full-width'
            ? css`
                  height: 1rem;
              `
            : css`
                  display: none;
              `}
`;

const ButtonRowStyled = styled.div`
    display: flex;
    gap: 1rem;
    width: 100%;

    & > * {
        flex: 1;
    }
`;

const useSendMutation = (params: TonConnectTransactionPayload, waitInvalidation?: boolean) => {
    const wallet = useWalletContext();
    const sdk = useAppSdk();
    const { api } = useAppContext();
    const client = useQueryClient();
    const { t } = useTranslation();
    const { mutateAsync: checkTouchId } = useCheckTouchId();

    return useMutation<string, Error>(async () => {
        const signer = await getSigner(sdk, wallet.publicKey, checkTouchId);

        let boc: string;
        switch (signer.type) {
            case 'cell': {
                boc = await sendTonConnectTransfer(api, wallet, params, signer);
                break;
            }
            default: {
                throw new TxConfirmationCustomError(t('ledger_operation_not_supported'));
            }
        }

        const invalidationPromise = client.invalidateQueries({
            predicate: query => query.queryKey.includes(wallet.active.rawAddress)
        });
        if (waitInvalidation) {
            await invalidationPromise;
        }
        return boc;
    });
};

const NotificationSkeleton: FC<{ handleClose: (result?: string) => void }> = ({ handleClose }) => {
    const { t } = useTranslation();

    return (
        <NotificationBlock>
            <SkeletonList size={3} margin fullWidth />
            <ButtonGap />
            <NotificationFooterPortal>
                <NotificationFooter>
                    <ButtonRowStyled>
                        <Button size="large" type="button" onClick={() => handleClose()}>
                            {t('notifications_alert_cancel')}
                        </Button>
                        <Button size="large" type="submit" primary loading>
                            {t('confirm')}
                        </Button>
                    </ButtonRowStyled>
                </NotificationFooter>
            </NotificationFooterPortal>
        </NotificationBlock>
    );
};

const ErrorStyled = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    margin: 1rem 0px 2rem;
`;

const Header = styled(H2)`
    text-align: center;
`;

const NotificationIssue: FC<{
    kind: 'not-enough-balance';
    handleClose: (result?: string) => void;
}> = ({ handleClose }) => {
    const { t } = useTranslation();

    return (
        <NotificationBlock>
            <ErrorStyled>
                <ErrorIcon />
                <Header>{t('send_screen_steps_amount_insufficient_balance')}</Header>
            </ErrorStyled>

            <ButtonGap />
            <NotificationFooterPortal>
                <NotificationFooter>
                    <ButtonRowStyled>
                        <Button size="large" type="button" onClick={() => handleClose()}>
                            {t('notifications_alert_cancel')}
                        </Button>
                    </ButtonRowStyled>
                </NotificationFooter>
            </NotificationFooterPortal>
        </NotificationBlock>
    );
};

const ConnectContent: FC<{
    params: TonConnectTransactionPayload;
    handleClose: (result?: string) => void;
    waitInvalidation?: boolean;
}> = ({ params, handleClose, waitInvalidation }) => {
    const sdk = useAppSdk();
    const [done, setDone] = useState(false);

    const { t } = useTranslation();

    const { data: issues, isFetched } = useTransactionError(params);
    const { data: estimate, isLoading: isEstimating, isError } = useEstimation(params, isFetched);
    const { mutateAsync, isLoading } = useSendMutation(params, waitInvalidation);

    useEffect(() => {
        if (sdk.twaExpand) {
            sdk.twaExpand();
        }
        sdk.hapticNotification('success');
    }, []);

    const onSubmit = async () => {
        try {
            const result = await mutateAsync();
            setDone(true);
            sdk.hapticNotification('success');
            setTimeout(() => handleClose(result), 300);
        } catch (e) {
            console.error(e);
        }
    };

    if (issues?.kind !== undefined) {
        return <NotificationIssue kind={issues?.kind} handleClose={handleClose} />;
    }

    if (isEstimating) {
        return <NotificationSkeleton handleClose={handleClose} />;
    }

    return (
        <NotificationBlock>
            <EmulationList isError={isError} estimate={estimate} />
            <ButtonGap />
            <NotificationFooterPortal>
                <NotificationFooter>
                    {done && (
                        <ResultButton done>
                            <CheckmarkCircleIcon />
                            <Label2>{t('ton_login_success')}</Label2>
                        </ResultButton>
                    )}
                    {!done && (
                        <ButtonRowStyled>
                            <Button
                                size="large"
                                type="button"
                                loading={isLoading}
                                disabled={isLoading}
                                onClick={() => handleClose()}
                            >
                                {t('notifications_alert_cancel')}
                            </Button>
                            <Button
                                size="large"
                                type="button"
                                primary
                                loading={isLoading}
                                disabled={isLoading}
                                onClick={onSubmit}
                            >
                                {t('confirm')}
                            </Button>
                        </ButtonRowStyled>
                    )}
                </NotificationFooter>
            </NotificationFooterPortal>
        </NotificationBlock>
    );
};

const useEstimation = (params: TonConnectTransactionPayload, errorFetched: boolean) => {
    const { api } = useAppContext();
    const wallet = useWalletContext();

    return useQuery<EstimateData, Error>(
        [QueryKey.estimate, params],
        async () => {
            const accountEvent = await estimateTonConnectTransfer(api, wallet, params);
            return { accountEvent };
        },
        { enabled: errorFetched }
    );
};

const useTransactionError = (params: TonConnectTransactionPayload) => {
    const { api } = useAppContext();
    const wallet = useWalletContext();

    return useQuery<ConnectTransferError, Error>([QueryKey.estimate, 'error', params], async () => {
        return tonConnectTransferError(api, wallet, params);
    });
};

const NotificationTitleRowStyled = styled(NotificationTitleRow)`
    align-items: flex-start;
`;

const WalletInfoStyled = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    color: ${p => p.theme.textSecondary};

    > ${Body2} {
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const NotificationTitleWithWalletName: FC<{ onClose: () => void }> = ({ onClose }) => {
    const wallet = useWalletContext();
    const { t } = useTranslation();

    return (
        <NotificationHeaderPortal>
            <NotificationHeader>
                <NotificationTitleRowStyled handleClose={onClose}>
                    <div>
                        {t('txActions_signRaw_title')}
                        <WalletInfoStyled>
                            <Body2>
                                {t('confirmSendModal_wallet')}&nbsp;
                                {wallet.name ?? toShortValue(wallet.active.friendlyAddress)}
                            </Body2>
                            <WalletEmoji
                                emojiSize="20px"
                                containerSize="20px"
                                emoji={wallet.emoji}
                            />
                        </WalletInfoStyled>
                    </div>
                </NotificationTitleRowStyled>
            </NotificationHeader>
        </NotificationHeaderPortal>
    );
};

export const TonTransactionNotification: FC<{
    params: TonConnectTransactionPayload | null;
    handleClose: (result?: string) => void;
    waitInvalidation?: boolean;
}> = ({ params, handleClose, waitInvalidation }) => {
    const { t } = useTranslation();
    const { account } = useAppContext();
    const Content = useCallback(() => {
        if (!params) return undefined;
        return (
            <>
                {account.publicKeys.length > 1 && (
                    <NotificationTitleWithWalletName onClose={() => handleClose()} />
                )}
                <ConnectContent
                    params={params}
                    handleClose={handleClose}
                    waitInvalidation={waitInvalidation}
                />
            </>
        );
    }, [origin, params, handleClose, account.publicKeys.length]);

    return (
        <>
            <Notification
                isOpen={params != null}
                handleClose={() => handleClose()}
                title={account.publicKeys.length > 1 ? undefined : t('txActions_signRaw_title')}
                hideButton
            >
                {Content}
            </Notification>
        </>
    );
};
