import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import Tag from '@app/components/Common/Tag';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import type { AlbumResult } from '@server/models/Music';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages({
  albumtype: 'Album Type',
  trackcount: '{count, plural, one {# Track} other {# Tracks}}',
  overview: 'Overview',
  overviewunavailable: 'Overview unavailable.',
  artist: 'Artist',
  disambiguation: 'Disambiguation',
  tracklist: 'Track List',
  trackavailable: 'Track is downloaded',
});

interface AlbumDetailsProps {
  album?: AlbumResult;
}

interface Track {
  id: number;
  trackNumber: string;
  title: string;
  explicit: boolean;
  hasFile: boolean;
  duration: number;
  mediumNumber: number;
}

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AlbumDetails = ({ album }: AlbumDetailsProps) => {
  const intl = useIntl();
  const [groupedTracks, setGroupedTracks] = useState<Map<number, Track[]>>(
    new Map()
  );

  const { data: tracks } = useSWR<Track[]>(
    album?.id ? `/api/v1/music/album/${album.id}/tracks` : null
  );

  useEffect(() => {
    if (tracks) {
      const grouped = new Map<number, Track[]>();
      tracks.forEach((track) => {
        const medium = track.mediumNumber || 1;
        if (!grouped.has(medium)) {
          grouped.set(medium, []);
        }
        const mediumTracks = grouped.get(medium);
        if (mediumTracks) {
          mediumTracks.push(track);
        }
      });
      setGroupedTracks(grouped);
    }
  }, [tracks]);

  if (!album) {
    return <LoadingSpinner />;
  }

  return (
    <div className="media-page">
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
            {album.albumType && <Tag>{album.albumType}</Tag>}
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

        {tracks && tracks.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-bold text-white">
              {intl.formatMessage(messages.tracklist)}
            </h2>
            {Array.from(groupedTracks.entries()).map(
              ([mediumNumber, mediumTracks]) => (
                <div key={mediumNumber} className="mb-6">
                  {groupedTracks.size > 1 && (
                    <h3 className="mb-2 text-sm font-semibold text-gray-400">
                      Disc {mediumNumber}
                    </h3>
                  )}
                  <div className="overflow-hidden rounded-lg bg-gray-800">
                    <table className="w-full">
                      <tbody>
                        {mediumTracks.map((track, index) => (
                          <tr
                            key={track.id}
                            className={
                              index !== mediumTracks.length - 1
                                ? 'border-b border-gray-700'
                                : ''
                            }
                          >
                            <td className="w-12 py-3 pl-4 text-center text-sm text-gray-400">
                              {track.trackNumber}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white">
                                  {track.title}
                                </span>
                                {track.hasFile && (
                                  <CheckCircleIcon
                                    className="h-5 w-5 text-green-500"
                                    title={intl.formatMessage(
                                      messages.trackavailable
                                    )}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="w-16 py-3 pr-4 text-right text-sm text-gray-400">
                              {formatDuration(track.duration)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumDetails;
