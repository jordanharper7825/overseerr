import Header from '@app/components/Common/Header';
import PageTitle from '@app/components/Common/PageTitle';
import MusicSlider from '@app/components/MusicSlider';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  discovermusic: 'Music',
  topArtists: 'Top 50 Artists',
  topAlbums: 'Top 50 Albums',
  topTracks: 'Top 50 Tracks',
  trendingArtists: 'Trending Artists',
  recentAlbums: 'Recently Added Albums',
  myArtists: 'My Artists',
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
        sliderKey="lastfm-top-artists"
        title={intl.formatMessage(messages.topArtists)}
        url="/api/v1/discover/music/lastfm/top-artists"
      />

      <MusicSlider
        sliderKey="lastfm-top-albums"
        title={intl.formatMessage(messages.topAlbums)}
        url="/api/v1/discover/music/lastfm/top-albums"
      />

      <MusicSlider
        sliderKey="lastfm-top-tracks"
        title={intl.formatMessage(messages.topTracks)}
        url="/api/v1/discover/music/lastfm/top-tracks"
      />

      <MusicSlider
        sliderKey="lastfm-trending-artists"
        title={intl.formatMessage(messages.trendingArtists)}
        url="/api/v1/discover/music/lastfm/trending-artists"
      />

      <MusicSlider
        sliderKey="recent-albums"
        title={intl.formatMessage(messages.recentAlbums)}
        url="/api/v1/discover/music/recent-albums"
      />

      <MusicSlider
        sliderKey="my-artists"
        title={intl.formatMessage(messages.myArtists)}
        url="/api/v1/discover/music"
        linkUrl="/discover/music?sortBy=name"
      />
    </>
  );
};

export default DiscoverMusic;
