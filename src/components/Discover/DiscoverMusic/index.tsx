import Header from '@app/components/Common/Header';
import PageTitle from '@app/components/Common/PageTitle';
import MusicSlider from '@app/components/MusicSlider';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  discovermusic: 'Music',
  topArtists: 'Top Artists',
  topAlbums: 'Top Albums',
  topSongs: 'Top Songs',
  newReleases: 'New Releases',
  moreFromArtistsYouFollow: 'More from Artists You Follow',
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
        sliderKey="lastfm-top-songs"
        title={intl.formatMessage(messages.topSongs)}
        url="/api/v1/discover/music/lastfm/top-tracks"
      />

      <MusicSlider
        sliderKey="lastfm-top-albums"
        title={intl.formatMessage(messages.topAlbums)}
        url="/api/v1/discover/music/lastfm/top-albums"
      />

      <MusicSlider
        sliderKey="lastfm-new-releases"
        title={intl.formatMessage(messages.newReleases)}
        url="/api/v1/discover/music/lastfm/new-releases"
      />

      <MusicSlider
        sliderKey="more-from-artists-you-follow"
        title={intl.formatMessage(messages.moreFromArtistsYouFollow)}
        url="/api/v1/discover/music/artists-you-follow/albums"
      />
    </>
  );
};

export default DiscoverMusic;
