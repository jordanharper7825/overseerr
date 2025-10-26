import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import Tag from '@app/components/Common/Tag';
import type { AlbumResult } from '@server/models/Music';
import Link from 'next/link';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  albumtype: 'Album Type',
  trackcount: '{count, plural, one {# Track} other {# Tracks}}',
  overview: 'Overview',
  overviewunavailable: 'Overview unavailable.',
  artist: 'Artist',
  disambiguation: 'Disambiguation',
});

interface AlbumDetailsProps {
  album?: AlbumResult;
}

const AlbumDetails = ({ album }: AlbumDetailsProps) => {
  const intl = useIntl();

  if (!album) {
    return <LoadingSpinner />;
  }

  return (
    <div
      className="media-page"
      style={{
        height: 493,
      }}
    >
      <PageTitle title={album.title} />
      <div className="media-page-bg-image">
        {album.posterPath && (
          <div className="absolute inset-0">
            <CachedImage
              alt=""
              src={album.posterPath}
              layout="fill"
              objectFit="cover"
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(17, 24, 39, 0.47) 0%, rgba(17, 24, 39, 1) 100%)',
              }}
            />
          </div>
        )}
      </div>
      <div className="relative z-10 flex flex-col items-center pt-4 text-center text-white md:flex-row md:items-end md:text-left lg:pl-8">
        <div className="mb-4 flex-shrink-0 md:mb-0 md:mr-6">
          {album.posterPath && (
            <CachedImage
              src={album.posterPath}
              alt=""
              className="rounded-lg shadow-2xl"
              width={150}
              height={150}
              priority
            />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold md:text-4xl">{album.title}</h1>
          {album.disambiguation && (
            <div className="mt-1 text-xs text-gray-300 md:text-sm">
              {album.disambiguation}
            </div>
          )}
          {album.artistName && (
            <Link href={`/music/${album.artistId}`}>
              <a className="mt-2 block text-sm text-blue-400 hover:underline">
                {intl.formatMessage(messages.artist)}: {album.artistName}
              </a>
            </Link>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            {album.albumType && (
              <Tag>{album.albumType}</Tag>
            )}
            {album.trackCount !== undefined && (
              <Tag>
                {intl.formatMessage(messages.trackcount, {
                  count: album.trackCount,
                })}
              </Tag>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 px-4 pb-10 lg:px-8">
        {album.overview && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              {intl.formatMessage(messages.overview)}
            </h2>
            <p className="mt-2 text-sm text-gray-300 md:text-base">
              {album.overview}
            </p>
          </div>
        )}

        {!album.overview && (
          <div className="mb-6">
            <p className="text-sm text-gray-400">
              {intl.formatMessage(messages.overviewunavailable)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumDetails;
