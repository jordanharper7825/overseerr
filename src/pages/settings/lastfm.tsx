import SettingsLastfm from '@app/components/Settings/SettingsLastfm';
import SettingsLayout from '@app/components/Settings/SettingsLayout';
import useRouteGuard from '@app/hooks/useRouteGuard';
import { Permission } from '@app/hooks/useUser';
import type { NextPage } from 'next';

const LastfmSettingsPage: NextPage = () => {
  useRouteGuard(Permission.ADMIN);
  return (
    <SettingsLayout>
      <SettingsLastfm />
    </SettingsLayout>
  );
};

export default LastfmSettingsPage;
