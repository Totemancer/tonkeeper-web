import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FiatCurrencies } from '@tonkeeper/core/dist/entries/fiat';
import { localizationText } from '@tonkeeper/core/dist/entries/language';
import { Network, getApiConfig } from '@tonkeeper/core/dist/entries/network';
import { AuthState } from '@tonkeeper/core/dist/entries/password';
import { WalletState } from '@tonkeeper/core/dist/entries/wallet';
import { useWindowsScroll } from '@tonkeeper/uikit/dist/components/Body';
import { CopyNotification } from '@tonkeeper/uikit/dist/components/CopyNotification';
import { FooterGlobalStyle } from '@tonkeeper/uikit/dist/components/Footer';
import { HeaderGlobalStyle } from '@tonkeeper/uikit/dist/components/Header';
import { GlobalListStyle } from '@tonkeeper/uikit/dist/components/List';
import { Loading } from '@tonkeeper/uikit/dist/components/Loading';
import MemoryScroll from '@tonkeeper/uikit/dist/components/MemoryScroll';
import QrScanner from '@tonkeeper/uikit/dist/components/QrScanner';
import { SybHeaderGlobalStyle } from '@tonkeeper/uikit/dist/components/SubHeader';
import { AsideMenu } from '@tonkeeper/uikit/dist/components/aside/AsideMenu';
import ReceiveNotification from '@tonkeeper/uikit/dist/components/home/ReceiveNotification';
import NftNotification from '@tonkeeper/uikit/dist/components/nft/NftNotification';
import {
    AddFavoriteNotification,
    EditFavoriteNotification
} from '@tonkeeper/uikit/dist/components/transfer/FavoriteNotification';
import SendActionNotification from '@tonkeeper/uikit/dist/components/transfer/SendNotifications';
import SendNftNotification from '@tonkeeper/uikit/dist/components/transfer/nft/SendNftNotification';
import { AmplitudeAnalyticsContext, useTrackLocation } from '@tonkeeper/uikit/dist/hooks/amplitude';
import { AppContext, WalletStateContext } from '@tonkeeper/uikit/dist/hooks/appContext';
import {
    AfterImportAction,
    AppSdkContext,
    OnImportAction
} from '@tonkeeper/uikit/dist/hooks/appSdk';
import { useLock } from '@tonkeeper/uikit/dist/hooks/lock';
import { StorageContext } from '@tonkeeper/uikit/dist/hooks/storage';
import { I18nContext, TranslationContext } from '@tonkeeper/uikit/dist/hooks/translation';
import { AppProRoute, AppRoute, any } from '@tonkeeper/uikit/dist/libs/routes';
import Activity from '@tonkeeper/uikit/dist/pages/activity/Activity';
import Browser from '@tonkeeper/uikit/dist/pages/browser';
import Coin from '@tonkeeper/uikit/dist/pages/coin/Coin';
import DashboardPage from '@tonkeeper/uikit/dist/pages/dashboard';
import { MainColumn } from '@tonkeeper/uikit/dist/pages/home/MainColumn';
import { Unlock } from '@tonkeeper/uikit/dist/pages/home/Unlock';
import { UnlockNotification } from '@tonkeeper/uikit/dist/pages/home/UnlockNotification';
import ImportRouter from '@tonkeeper/uikit/dist/pages/import';
import Initialize, { InitializeContainer } from '@tonkeeper/uikit/dist/pages/import/Initialize';
import { Purchases } from '@tonkeeper/uikit/dist/pages/purchases/Purchases';
import { Tokens } from '@tonkeeper/uikit/dist/pages/purchases/Tokens';
import Settings from '@tonkeeper/uikit/dist/pages/settings';
import { UserThemeProvider } from '@tonkeeper/uikit/dist/providers/UserThemeProvider';
import { useAccountState } from '@tonkeeper/uikit/dist/state/account';
import { useAuthState } from '@tonkeeper/uikit/dist/state/password';
import { useProBackupState } from '@tonkeeper/uikit/dist/state/pro';
import { useTonendpoint, useTonenpointConfig } from '@tonkeeper/uikit/dist/state/tonendpoint';
import { useActiveWallet } from '@tonkeeper/uikit/dist/state/wallet';
import { Container, GlobalStyleCss } from '@tonkeeper/uikit/dist/styles/globalStyle';
import { FC, Suspense, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MemoryRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { DesktopAppSdk } from '../libs/appSdk';
import { useAnalytics, useAppHeight, useAppWidth } from '../libs/hooks';
import { DeepLinkSubscription } from './components/DeepLink';
import { TonConnectSubscription } from './components/TonConnectSubscription';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30000,
            refetchOnWindowFocus: false
        }
    }
});

const GlobalStyle = createGlobalStyle`
    ${GlobalStyleCss};
    
    html, body, #root {
        height: 100%;
        overflow: hidden;
    }

    html.is-locked {
        height: var(--app-height);
    }

    button, input[type="submit"], input[type="reset"] {
      background: none;
      color: inherit;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      outline: inherit;
    }
`;

const sdk = new DesktopAppSdk();
const TARGET_ENV = 'desktop';

const langs = 'en,zh_CN,ru,it,tr';
const listOfAuth: AuthState['kind'][] = ['keychain'];

declare const REACT_APP_TONCONSOLE_API: string;

export const App = () => {
    const { t, i18n } = useTranslation();

    const translation = useMemo(() => {
        const languages = langs.split(',');
        const client: I18nContext = {
            t,
            i18n: {
                enable: true,
                reloadResources: i18n.reloadResources,
                changeLanguage: i18n.changeLanguage as any,
                language: i18n.language,
                languages: languages
            }
        };
        return client;
    }, [t, i18n]);

    return (
        <MemoryRouter>
            <QueryClientProvider client={queryClient}>
                <Suspense fallback={<div></div>}>
                    <AppSdkContext.Provider value={sdk}>
                        <TranslationContext.Provider value={translation}>
                            <StorageContext.Provider value={sdk.storage}>
                                <ThemeAndContent />
                            </StorageContext.Provider>
                        </TranslationContext.Provider>
                    </AppSdkContext.Provider>
                </Suspense>
            </QueryClientProvider>
        </MemoryRouter>
    );
};

const ThemeAndContent = () => {
    const { data } = useProBackupState();
    return (
        <UserThemeProvider displayType="full-width" isPro={data?.valid}>
            <GlobalStyle />
            <HeaderGlobalStyle />
            <FooterGlobalStyle />
            <SybHeaderGlobalStyle />
            <GlobalListStyle />
            <Loader />
            <UnlockNotification sdk={sdk} />
        </UserThemeProvider>
    );
};

const FullSizeWrapper = styled(Container)``;

const Wrapper = styled.div`
    box-sizing: border-box;
    padding-top: 64px;

    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: var(--app-height);
    background-color: ${props => props.theme.backgroundPage};
    white-space: pre-wrap;
`;

const WideLayout = styled.div`
    width: 100%;
    height: 100%;
    display: flex;

    & > *:first-child {
        width: 200px;
    }
`;

const WideContent = styled.div`
    flex: 1;
    overflow: auto;
`;

const WalletLayout = styled.div`
    display: flex;
    height: 100%;
`;

const FirstColumn = styled.div`
    display: flex;
    flex-basis: 40%;
    overflow: auto;
    flex-direction: column;
    padding: 64px 16px 0;
    flex-shrink: 0;
`;

const SecondColumn = styled.div`
    display: flex;
    flex-grow: 1;
    overflow: auto;
    position: relative;
`;

const FullSizeWrapperBounded = styled(FullSizeWrapper)`
    max-height: 100%;
    overflow: auto;
`;

export const Loader: FC = () => {
    const { data: activeWallet } = useActiveWallet();

    const lock = useLock(sdk);
    const { i18n } = useTranslation();
    const { data: account } = useAccountState();
    const { data: auth } = useAuthState();

    const tonendpoint = useTonendpoint(
        TARGET_ENV,
        sdk.version,
        activeWallet?.network,
        activeWallet?.lang
    );
    const { data: config } = useTonenpointConfig(tonendpoint);

    const navigate = useNavigate();
    useAppHeight();

    const { data: tracker } = useAnalytics(sdk.version, account, activeWallet);

    useEffect(() => {
        if (
            activeWallet &&
            activeWallet.lang &&
            i18n.language !== localizationText(activeWallet.lang)
        ) {
            i18n.reloadResources([localizationText(activeWallet.lang)]).then(() =>
                i18n.changeLanguage(localizationText(activeWallet.lang))
            );
        }
    }, [activeWallet, i18n]);

    useEffect(() => {
        window.backgroundApi.onRefresh(() => queryClient.invalidateQueries());
    }, []);

    if (auth === undefined || account === undefined || config === undefined || lock === undefined) {
        return <Loading />;
    }

    const network = activeWallet?.network ?? Network.MAINNET;
    const fiat = activeWallet?.fiat ?? FiatCurrencies.USD;
    const context = {
        api: getApiConfig(config, network, REACT_APP_TONCONSOLE_API),
        auth,
        fiat,
        account,
        config,
        tonendpoint,
        standalone: true,
        extension: false,
        proFeatures: true,
        ios: false
    };

    return (
        <AmplitudeAnalyticsContext.Provider value={tracker}>
            <OnImportAction.Provider value={navigate}>
                <AfterImportAction.Provider
                    value={() => navigate(AppRoute.home, { replace: true })}
                >
                    <AppContext.Provider value={context}>
                        <Content activeWallet={activeWallet} lock={lock} />
                        <CopyNotification />
                        <QrScanner />
                    </AppContext.Provider>
                </AfterImportAction.Provider>
            </OnImportAction.Provider>
        </AmplitudeAnalyticsContext.Provider>
    );
};

export const Content: FC<{
    activeWallet?: WalletState | null;
    lock: boolean;
}> = ({ activeWallet, lock }) => {
    const location = useLocation();
    useWindowsScroll();
    useAppWidth();
    useTrackLocation();

    if (lock) {
        return (
            <FullSizeWrapper>
                <Unlock />
            </FullSizeWrapper>
        );
    }

    if (!activeWallet || location.pathname.startsWith(AppRoute.import)) {
        return (
            <FullSizeWrapperBounded>
                <Suspense fallback={<Loading />}>
                    <InitializeContainer fullHeight={false}>
                        <Routes>
                            <Route
                                path={any(AppRoute.import)}
                                element={<ImportRouter listOfAuth={listOfAuth} />}
                            />
                            <Route path="*" element={<Initialize />} />
                        </Routes>
                    </InitializeContainer>
                </Suspense>
            </FullSizeWrapperBounded>
        );
    }

    return (
        <WalletStateContext.Provider value={activeWallet}>
            <WideLayout>
                <AsideMenu />
                <WideContent>
                    <Routes>
                        <Route path={AppProRoute.dashboard} element={<DashboardPage />} />
                        <Route path="*" element={<WalletContent />} />
                    </Routes>
                </WideContent>
            </WideLayout>
        </WalletStateContext.Provider>
    );
};

const WalletContent = () => {
    return (
        <WalletLayout>
            <FirstColumn>
                <MainColumn />
            </FirstColumn>
            <SecondColumn>
                <Routes>
                    <Route element={<OldAppRouting />}>
                        <Route path={AppRoute.activity} element={<Activity />} />
                        <Route path={any(AppRoute.browser)} element={<Browser />} />
                        <Route path={any(AppRoute.purchases)} element={<Purchases />} />
                        <Route path={any(AppRoute.settings)} element={<Settings />} />
                        <Route path={AppRoute.coins}>
                            <Route path=":name/*" element={<Coin />} />
                        </Route>
                        <Route path="*" element={<Tokens />} />
                    </Route>
                </Routes>
            </SecondColumn>
        </WalletLayout>
    );
};

const OldAppRouting = () => {
    return (
        <Wrapper>
            <Outlet />
            <MemoryScroll />
            <SendActionNotification />
            <ReceiveNotification />
            <TonConnectSubscription />
            <NftNotification />
            <SendNftNotification />
            <AddFavoriteNotification />
            <EditFavoriteNotification />
            <DeepLinkSubscription />
        </Wrapper>
    );
};
