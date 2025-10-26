import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import Tag from '@app/components/Common/Tag';
import Error from '@app/pages/_error';
import type { ArtistResult, AlbumResult } from '@server/models/Music';
import Link from 'next/link';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages({
  artisttype: 'Artist Type',
  albumcount: '{count, plural, one {# Album} other {# Albums}}',
  overview: 'Overview',
  overviewunavailable: 'Overview unavailable.',
  albums: 'Albums',
  disambiguation: 'Disambiguation',
});

interface ArtistDetailsProps {
  artist?: ArtistResult;
}

const ArtistDetails = ({ artist }: ArtistDetailsProps) => {
  const intl = useIntl();

  const { data: albumData, error: albumError } = useSWR<AlbumResult[]>(
    artist ? `/api/v1/music/${artist.id}/albums` : null
  );

  if (!artist) {
    return <LoadingSpinner />;
  }

  if (albumError) {
    return <Error statusCode={500} />;
  }

  return (
    <div
      className="media-page"
      style={{
        height: 493,
      }}
    >
      <PageTitle title={artist.name} />
      <div className="media-page-bg-image">
        {artist.posterPath && (
          <div className="absolute inset-0">
            <CachedImage
              alt=""
              src={artist.posterPath}
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
          {artist.posterPath && (
            <CachedImage
              src={artist.posterPath}
              alt=""
              className="rounded-lg shadow-2xl"
              width={150}
              height={225}
              priority
            />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold md:text-4xl">{artist.name}</h1>
          {artist.disambiguation && (
            <div className="mt-1 text-xs text-gray-300 md:text-sm">
              {artist.disambiguation}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            {artist.artistType && (
              <Tag>{artist.artistType}</Tag>
            )}
            {artist.albumCount !== undefined && (
              <Tag>
                {intl.formatMessage(messages.albumcount, {
                  count: artist.albumCount,
                })}
              </Tag>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 px-4 pb-10 lg:px-8">
        {artist.overview && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              {intl.formatMessage(messages.overview)}
            </h2>
            <p className="mt-2 text-sm text-gray-300 md:text-base">
              {artist.overview}
            </p>
          </div>
        )}

        {!artist.overview && (
          <div className="mb-6">
            <p className="text-sm text-gray-400">
              {intl.formatMessage(messages.overviewunavailable)}
            </p>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-bold text-white">
            {intl.formatMessage(messages.albums)}
          </h2>
          {!albumData && <LoadingSpinner />}
          {albumData && albumData.length === 0 && (
            <div className="mt-4 text-sm text-gray-400">
              No albums found for this artist.
            </div>
          )}
          {albumData && albumData.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {albumData.map((album) => (
                <Link key={album.id} href={`/album/${album.id}`}>
                  <a className="cursor-pointer rounded-lg bg-gray-800 p-2 transition hover:bg-gray-700 block">
                    {album.posterPath && (
                      <CachedImage
                        src={album.posterPath}
                        alt={album.title}
                        width={200}
                        height={200}
                        className="rounded"
                      />
                    )}
                    {!album.posterPath && (
                      <div className="flex h-48 w-full items-center justify-center rounded bg-gray-700">
                        <span className="text-xs text-gray-400">No Image</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <h3 className="text-sm font-medium text-white line-clamp-2">
                        {album.title}
                      </h3>
                      {album.trackCount && (
                        <p className="text-xs text-gray-400">
                          {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
                        </p>
                      )}
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistDetails;
