import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWalletWithCustomAuthState } from '@tonkeeper/core/dist/service/accountService';
import { walletStateFromSignerQr } from '@tonkeeper/core/dist/service/walletService';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/appContext';
import { useAppSdk } from '../hooks/appSdk';
import { QueryKey } from '../libs/queryKey';
import { AppRoute } from '../libs/routes';

export const usePairSignerMutation = () => {
    const sdk = useAppSdk();
    const { api, config } = useAppContext();
    const client = useQueryClient();
    const navigate = useNavigate();
    return useMutation<void, Error, string>(async qrCode => {
        try {
            const state = await walletStateFromSignerQr(api, qrCode, config);

            await addWalletWithCustomAuthState(sdk.storage, state);

            await client.invalidateQueries([QueryKey.account]);

            navigate(AppRoute.home);
        } catch (e) {
            if (e instanceof Error) sdk.alert(e.message);
            throw e;
        }
    });
};
