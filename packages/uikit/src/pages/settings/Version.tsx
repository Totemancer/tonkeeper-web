import {
    WalletVersion as WalletVersionEnum,
    WalletVersions,
    walletVersionText
} from '@tonkeeper/core/dist/entries/wallet';
import { getWalletAddress } from '@tonkeeper/core/dist/service/walletService';
import { toShortValue } from '@tonkeeper/core/dist/utils/common';
import { useMemo } from 'react';
import styled from 'styled-components';
import { InnerBody } from '../../components/Body';
import { CheckIcon } from '../../components/Icon';
import { SubHeader } from '../../components/SubHeader';
import { Body2 } from '../../components/Text';
import { SettingsItem, SettingsList } from '../../components/settings/SettingsList';
import { useAppContext, useWalletContext } from '../../hooks/appContext';
import { useTranslation } from '../../hooks/translation';
import { useMutateWalletVersion } from '../../state/account';
import { useEnableW5 } from '../../state/experemental';
import { useIsActiveWalletKeystone } from '../../state/keystone';
import { useIsActiveWalletLedger } from '../../state/ledger';

const LedgerError = styled(Body2)`
    margin: 0.5rem 0;
    color: ${p => p.theme.accentRed};
`;

export const WalletVersion = () => {
    const { t } = useTranslation();
    const { experimental } = useAppContext();
    const isLedger = useIsActiveWalletLedger();
    const isKeystone = useIsActiveWalletKeystone();
    const { data: enableW5 } = useEnableW5();
    const wallet = useWalletContext();

    const { mutate, isLoading } = useMutateWalletVersion();

    const items = useMemo<SettingsItem[]>(() => {
        const publicKey = Buffer.from(wallet.publicKey, 'hex');
        const list = [...WalletVersions];

        if (experimental && enableW5) {
            list.push(WalletVersionEnum.W5);
        }

        return list.map(item => ({
            name: walletVersionText(item),
            secondary: toShortValue(
                getWalletAddress(publicKey, item, wallet.network).friendlyAddress
            ),
            icon: wallet.active.version === item ? <CheckIcon /> : undefined,
            action: () => mutate(item)
        }));
    }, [wallet, mutate, experimental, enableW5]);

    return (
        <>
            <SubHeader title={t('settings_wallet_version')} />
            <InnerBody>
                <SettingsList
                    isDisabled={isLedger || isKeystone}
                    items={items}
                    loading={isLoading}
                />
                {isLedger && <LedgerError>{t('ledger_operation_not_supported')}</LedgerError>}
                {isKeystone && <LedgerError>{t('operation_not_supported')}</LedgerError>}
            </InnerBody>
        </>
    );
};
