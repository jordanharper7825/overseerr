import Header from '@app/components/Common/Header';
import PageTitle from '@app/components/Common/PageTitle';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  discovermusic: 'Music',
  comingsoon: 'Music discovery coming soon!',
  description:
    'Browse and discover music will be available here. Music API integration is in development.',
});

const DiscoverMusic = () => {
  const intl = useIntl();
  const title = intl.formatMessage(messages.discovermusic);

  return (
    <>
      <PageTitle title={title} />
      <div className="mb-4">
        <Header>{title}</Header>
      </div>
      <div className="flex flex-col items-center justify-center py-24">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">
            {intl.formatMessage(messages.comingsoon)}
          </h2>
          <p className="text-gray-400">
            {intl.formatMessage(messages.description)}
          </p>
        </div>
      </div>
    </>
  );
};

export default DiscoverMusic;
