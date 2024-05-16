import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InnerBody } from '../../components/Body';
import { ListBlock, ListItem, ListItemPayload } from '../../components/List';
import { SubHeader } from '../../components/SubHeader';
import { Label1 } from '../../components/Text';
import { ChangePasswordNotification } from '../../components/create/ChangePassword';
import { Switch } from '../../components/fields/Switch';
import { KeyIcon, LockIcon } from '../../components/settings/SettingsIcons';
import { SettingsItem, SettingsList } from '../../components/settings/SettingsList';
import { useAppContext, useWalletContext } from '../../hooks/appContext';
import { useTranslation } from '../../hooks/translation';
import { AppRoute, SettingsRoute } from '../../libs/routes';
import { useIsActiveWalletLedger } from '../../state/ledger';
import {
    useCanPromptTouchId,
    useLookScreen,
    useMutateLookScreen,
    useMutateTouchId,
    useTouchIdEnabled
} from '../../state/password';

const LockSwitch = () => {
    const { t } = useTranslation();

    const { auth } = useAppContext();

    const { data } = useLookScreen();
    const { mutate: toggleLock } = useMutateLookScreen();

    if (auth.kind === 'password') {
        return (
            <ListBlock>
                <ListItem hover={false}>
                    <ListItemPayload>
                        <Label1>{t('Lock_screen')}</Label1>
                        <Switch checked={!!data} onChange={toggleLock} />
                    </ListItemPayload>
                </ListItem>
            </ListBlock>
        );
    } else {
        return <></>;
    }
};

const TouchIdSwitch = () => {
    const { t } = useTranslation();
    const { data: canPrompt } = useCanPromptTouchId();

    const { data: touchIdEnabled } = useTouchIdEnabled();
    const { mutate } = useMutateTouchId();

    console.log(touchIdEnabled);

    if (!canPrompt) {
        return null;
    }

    return (
        <ListBlock>
            <ListItem hover={false}>
                <ListItemPayload>
                    <Label1>{t('biometry_ios_fingerprint')}</Label1>
                    <Switch checked={!!touchIdEnabled} onChange={mutate} />
                </ListItemPayload>
            </ListItem>
        </ListBlock>
    );
};

const ChangePassword = () => {
    const { t } = useTranslation();
    const [isOpen, setOpen] = useState(false);

    const { auth: walletAuth } = useWalletContext();
    const { auth: globalAuth } = useAppContext();
    const items = useMemo(() => {
        const i: SettingsItem[] = [
            {
                name: t('Change_password'),
                icon: <LockIcon />,
                action: () => setOpen(true)
            }
        ];
        return i;
    }, []);

    if (walletAuth == null && globalAuth.kind === 'password') {
        return (
            <>
                <SettingsList items={items} />
                <ChangePasswordNotification isOpen={isOpen} handleClose={() => setOpen(false)} />
            </>
        );
    } else {
        return <></>;
    }
};

const ShowPhrases = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const isLedger = useIsActiveWalletLedger();

    const items = useMemo(() => {
        const i: SettingsItem[] = [
            {
                name: t('settings_backup_seed'),
                icon: <KeyIcon />,
                action: () => navigate(AppRoute.settings + SettingsRoute.recovery)
            }
        ];
        return i;
    }, []);

    if (isLedger) {
        return <></>;
    }

    return <SettingsList items={items} />;
};

export const SecuritySettings = () => {
    const { t } = useTranslation();
    return (
        <>
            <SubHeader title={t('settings_security')} />
            <InnerBody>
                <LockSwitch />
                <TouchIdSwitch />
                <ChangePassword />
                <ShowPhrases />
            </InnerBody>
        </>
    );
};
