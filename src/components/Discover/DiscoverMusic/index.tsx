import Header from '@app/components/Common/Header';
import PageTitle from '@app/components/Common/PageTitle';
import MusicSlider from '@app/components/MusicSlider';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  discovermusic: 'Music',
  popularartists: 'Popular Artists',
  topalbums: 'Top Albums',
  recentalbums: 'Recently Added Albums',
  allartists: 'All Artists',
});

const DiscoverMusic = () => {
  const intl = useIntl();
  const title = intl.formatMessage(messages.discovermusic);

  return (
    <>
      <PageTitle title={title} />
      <div className="mb-8">
        <Header>{title}</Header>
      </div>

      <MusicSlider
        sliderKey="popular-artists"
        title={intl.formatMessage(messages.popularartists)}
        url="/api/v1/discover/music/popular-artists"
        linkUrl="/discover/music?sortBy=albumCount"
      />

      <MusicSlider
        sliderKey="recent-albums"
        title={intl.formatMessage(messages.recentalbums)}
        url="/api/v1/discover/music/recent-albums"
      />

      <MusicSlider
        sliderKey="top-albums"
        title={intl.formatMessage(messages.topalbums)}
        url="/api/v1/discover/music/top-albums"
      />

      <MusicSlider
        sliderKey="all-artists"
        title={intl.formatMessage(messages.allartists)}
        url="/api/v1/discover/music"
        linkUrl="/discover/music?sortBy=name"
      />
    </>
  );
};

export default DiscoverMusic;
