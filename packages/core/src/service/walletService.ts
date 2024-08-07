import { UR } from '@keystonehq/keystone-sdk/dist/types/ur';
import { parseTonAccount } from '@keystonehq/keystone-sdk/dist/wallet/hdKey';
import { Address } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton/dist/wallets/WalletContractV4';
import { WalletContractV5R1 } from '@ton/ton/dist/wallets/WalletContractV5R1';
import queryString from 'query-string';
import { AppKey } from '../Keys';
import { IStorage } from '../Storage';
import { APIConfig } from '../entries/apis';
import { Network } from '../entries/network';
import { AuthState } from '../entries/password';
import { WalletAddress, WalletState, WalletVersion, WalletVersions } from '../entries/wallet';
import { WalletApi } from '../tonApiV2';
import { TonendpointConfig } from '../tonkeeperApi/tonendpoint';
import { encrypt } from './cryptoService';
import { walletContract } from './wallet/contractService';
import { getFallbackWalletEmoji, getWalletStateOrDie, setWalletState } from './wallet/storeService';

export const createNewWalletState = async (
    api: APIConfig,
    mnemonic: string[],
    config: TonendpointConfig,
    name?: string
) => {
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    const publicKey = keyPair.publicKey.toString('hex');

    const active = await findWalletAddress(api, publicKey, config.flags?.disable_v5r1 ?? true);

    const state: WalletState = {
        publicKey,
        active,
        revision: 0,
        name,
        emoji: getFallbackWalletEmoji(publicKey)
    };

    // state.tron = await getTronWallet(api.tronApi, mnemonic, state).catch(() => undefined);

    return state;
};

export const encryptWalletMnemonic = async (mnemonic: string[], password: string) => {
    return encrypt(mnemonic.join(' '), password);
};

const versionMap: Record<string, WalletVersion> = {
    wallet_v3r1: WalletVersion.V3R1,
    wallet_v3r2: WalletVersion.V3R2,
    wallet_v4r2: WalletVersion.V4R2,
    wallet_v5_beta: WalletVersion.V5beta,
    wallet_v5r1: WalletVersion.V5R1
};

const findWalletVersion = (interfaces?: string[]): WalletVersion => {
    if (!interfaces) {
        throw new Error('Unexpected wallet version');
    }
    for (const value of interfaces) {
        if (versionMap[value] !== undefined) {
            return versionMap[value];
        }
    }
    throw new Error('Unexpected wallet version');
};

const findWalletAddress = async (api: APIConfig, publicKey: string, disable_v5r1: boolean) => {
    try {
        const result = await new WalletApi(api.tonApiV2).getWalletsByPublicKey({
            publicKey: publicKey
        });

        const [activeWallet] = result.accounts
            .filter(wallet => {
                if (wallet.interfaces?.some(value => Object.keys(versionMap).includes(value))) {
                    return wallet.balance > 0 || wallet.status === 'active';
                }
                return false;
            })
            .sort((one, two) => two.balance - one.balance);

        if (activeWallet) {
            const wallet: WalletAddress = {
                rawAddress: activeWallet.address,
                friendlyAddress: Address.parse(activeWallet.address).toString(),
                version: findWalletVersion(activeWallet.interfaces)
            };

            return wallet;
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(e);
    }

    if (disable_v5r1) {
        const contact = WalletContractV4.create({
            workchain: 0,
            publicKey: Buffer.from(publicKey, 'hex')
        });
        const wallet: WalletAddress = {
            rawAddress: contact.address.toRawString(),
            friendlyAddress: contact.address.toString(),
            version: WalletVersion.V4R2
        };
        return wallet;
    } else {
        const contact = WalletContractV5R1.create({
            workChain: 0,
            publicKey: Buffer.from(publicKey, 'hex')
        });
        const wallet: WalletAddress = {
            rawAddress: contact.address.toRawString(),
            friendlyAddress: contact.address.toString(),
            version: WalletVersion.V5R1
        };

        return wallet;
    }
};

export const getWalletAddress = (
    publicKey: Buffer,
    version: WalletVersion,
    network?: Network
): WalletAddress => {
    const { address } = walletContract(publicKey, version, network);
    return {
        rawAddress: address.toRawString(),
        friendlyAddress: address.toString({
            testOnly: network === Network.TESTNET,
            bounceable: false
        }),
        version
    };
};

export const getWalletsAddresses = (
    publicKey: Buffer | string,
    network?: Network
): Record<(typeof WalletVersions)[number], WalletAddress> => {
    if (typeof publicKey === 'string') {
        publicKey = Buffer.from(publicKey, 'hex');
    }

    return Object.fromEntries(
        WalletVersions.map(version => [
            version,
            getWalletAddress(publicKey as Buffer, version, network)
        ])
    ) as Record<(typeof WalletVersions)[number], WalletAddress>;
};

export const updateWalletVersion = async (
    storage: IStorage,
    wallet: WalletState,
    version: WalletVersion
) => {
    const updated: WalletState = {
        ...wallet,
        revision: wallet.revision + 1,
        active: getWalletAddress(Buffer.from(wallet.publicKey, 'hex'), version, wallet.network)
    };
    await setWalletState(storage, updated);
};

export const updateWalletProperty = async (
    storage: IStorage,
    wallet: WalletState,
    props: Partial<
        Pick<
            WalletState,
            | 'name'
            | 'hiddenJettons'
            | 'shownJettons'
            | 'orderJettons'
            | 'lang'
            | 'network'
            | 'emoji'
        >
    >
) => {
    const updated: WalletState = {
        ...wallet,
        ...props,
        revision: wallet.revision + 1
    };
    await setWalletState(storage, updated);
};

export const walletStateFromSignerQr = async (
    api: APIConfig,
    qrCode: string,
    config: TonendpointConfig
) => {
    if (!qrCode.startsWith('tonkeeper://signer')) {
        throw new Error('Unexpected QR code');
    }

    const {
        query: { pk, name }
    } = queryString.parseUrl(qrCode);

    if (typeof pk != 'string') {
        throw new Error('Unexpected QR code');
    }
    if (typeof name != 'string') {
        throw new Error('Unexpected QR code');
    }

    const publicKey = pk;

    const active = await findWalletAddress(api, publicKey, config.flags?.disable_v5r1 ?? true);

    const state: WalletState = {
        publicKey,
        active,
        revision: 0,
        name: name ? name : undefined,
        auth: { kind: 'signer' },
        emoji: getFallbackWalletEmoji(publicKey)
    };

    return state;
};

export const walletStateFromSignerDeepLink = async (
    api: APIConfig,
    publicKey: string,
    name: string | null,
    config: TonendpointConfig
) => {
    const active = await findWalletAddress(api, publicKey, config.flags?.disable_v5r1 ?? true);

    const state: WalletState = {
        publicKey,
        active,
        revision: 0,
        name: name ? name : undefined,
        auth: { kind: 'signer-deeplink' },
        emoji: getFallbackWalletEmoji(publicKey)
    };

    return state;
};

export const walletStateFromLedger = (walletInfo: {
    address: string;
    publicKey: Buffer;
    accountIndex: number;
}) => {
    const address = Address.parse(walletInfo.address);
    const publicKey = walletInfo.publicKey.toString('hex');

    const state: WalletState = {
        publicKey,
        active: {
            friendlyAddress: address.toString({ bounceable: false }),
            rawAddress: address.toRawString(),
            version: WalletVersion.V4R2
        },
        revision: 0,
        name: `Ledger ${walletInfo.accountIndex + 1}`,
        auth: { kind: 'ledger', accountIndex: walletInfo.accountIndex },
        emoji: getFallbackWalletEmoji(publicKey)
    };

    return state;
};

export const walletStateFromKeystone = (ur: UR) => {
    const account = parseTonAccount(ur);
    const contact = WalletContractV4.create({
        workchain: 0,
        publicKey: Buffer.from(account.publicKey, 'hex')
    });
    const wallet: WalletAddress = {
        rawAddress: contact.address.toRawString(),
        friendlyAddress: contact.address.toString(),
        version: WalletVersion.V4R2
    };

    const pathInfo =
        account.path && account.xfp ? { path: account.path, mfp: account.xfp } : undefined;

    const state: WalletState = {
        publicKey: account.publicKey,
        active: wallet,
        revision: 0,
        name: account.name ?? `Keystone`,
        auth: { kind: 'keystone', info: pathInfo },
        emoji: getFallbackWalletEmoji(account.publicKey)
    };

    return state;
};

export const getWalletAuthState = async (storage: IStorage, publicKey: string) => {
    const wallet = await getWalletStateOrDie(storage, publicKey);

    if (wallet.auth) {
        return wallet.auth;
    }

    const globalAuth = await storage.get<AuthState>(AppKey.GLOBAL_AUTH_STATE);
    if (!globalAuth) {
        throw new Error('Missing Auth');
    }

    return globalAuth;
};
