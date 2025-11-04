import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import Tag from '@app/components/Common/Tag';
import Error from '@app/pages/_error';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { AlbumResult, ArtistResult } from '@server/models/Music';
import axios from 'axios';
import Link from 'next/link';
import { useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages({
  artisttype: 'Artist Type',
  albumcount: '{count, plural, one {# Album} other {# Albums}}',
  overview: 'Overview',
  overviewunavailable: 'Overview unavailable.',
  albums: 'Albums',
  disambiguation: 'Disambiguation',
  request: 'Request Artist',
  requestsuccess: 'Artist requested successfully!',
  requesterror: 'Failed to request artist.',
  requestalbums: 'Hover over albums to request them individually',
});

interface ArtistDetailsProps {
  artist?: ArtistResult;
}

const ArtistDetails = ({ artist }: ArtistDetailsProps) => {
  const intl = useIntl();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [requestingAlbumId, setRequestingAlbumId] = useState<number | null>(
    null
  );
  const [requestedAlbums, setRequestedAlbums] = useState<Set<number>>(
    new Set()
  );

  // Check if foreignId is a UUID (MBID) or if we should use the numeric ID
  const isMBID =
    artist?.foreignId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      artist.foreignId
    );

  const albumsEndpoint = artist
    ? isMBID
      ? `/api/v1/music/mbid/${artist.foreignId}/albums`
      : `/api/v1/music/${artist.id}/albums`
    : null;

  const { data: albumData, error: albumError } =
    useSWR<AlbumResult[]>(albumsEndpoint);

  const handleRequestArtist = async () => {
    if (!artist || !isMBID) return;

    setIsRequesting(true);
    setRequestStatus('idle');

    try {
      await axios.post('/api/v1/music/request', {
        foreignArtistId: artist.foreignId,
        artistName: artist.name,
        monitored: true,
        searchForMissingAlbums: false,
      });
      setRequestStatus('success');
      // Reload the page after a short delay to show the updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      // Artist request failed
      setRequestStatus('error');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRequestAlbum = async (album: AlbumResult) => {
    if (!artist || !album.foreignId) return;

    setRequestingAlbumId(album.id);

    try {
      await axios.post('/api/v1/music/album/request', {
        foreignAlbumId: album.foreignId,
        title: album.title,
        foreignArtistId: artist.foreignId,
        artistName: artist.name,
        monitored: true,
        searchForNewAlbum: false,
      });
      setRequestedAlbums((prev) => {
        const newSet = new Set(prev);
        newSet.add(album.id);
        return newSet;
      });
    } catch (error) {
      // Album request failed
    } finally {
      setRequestingAlbumId(null);
    }
  };

  // Show request button only for MusicBrainz artists not in Lidarr
  const showRequestButton = isMBID && !artist?.mediaInfo;

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
            {artist.artistType && <Tag>{artist.artistType}</Tag>}
            {artist.albumCount !== undefined && (
              <Tag>
                {intl.formatMessage(messages.albumcount, {
                  count: artist.albumCount,
                })}
              </Tag>
            )}
          </div>
          {showRequestButton && (
            <div className="mt-4 flex justify-center md:justify-start">
              <Button
                buttonType={
                  requestStatus === 'success'
                    ? 'success'
                    : requestStatus === 'error'
                    ? 'danger'
                    : 'primary'
                }
                onClick={handleRequestArtist}
                disabled={isRequesting || requestStatus === 'success'}
                className="w-full md:w-auto"
              >
                <ArrowDownTrayIcon />
                <span>
                  {requestStatus === 'success'
                    ? intl.formatMessage(messages.requestsuccess)
                    : requestStatus === 'error'
                    ? intl.formatMessage(messages.requesterror)
                    : intl.formatMessage(messages.request)}
                </span>
              </Button>
            </div>
          )}
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
          {isMBID && (
            <p className="mt-2 text-sm text-gray-400">
              {intl.formatMessage(messages.requestalbums)}
            </p>
          )}
          {!albumData && <LoadingSpinner />}
          {albumData && albumData.length === 0 && (
            <div className="mt-4 text-sm text-gray-400">
              No albums found for this artist.
            </div>
          )}
          {albumData && albumData.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {albumData.map((album) => {
                // Only Lidarr albums (from non-MBID artists) are clickable
                // MusicBrainz albums show request button on hover
                const isLidarrAlbum = !isMBID;
                const isRequested = requestedAlbums.has(album.id);
                const isRequesting = requestingAlbumId === album.id;

                const albumCard = (
                  <div
                    className={`rounded-lg bg-gray-800 p-2 transition ${
                      isLidarrAlbum ? 'cursor-pointer hover:bg-gray-700' : ''
                    }`}
                  >
                    <div className="relative">
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
                          <span className="text-xs text-gray-400">
                            No Image
                          </span>
                        </div>
                      )}
                      {!isLidarrAlbum && !isRequested && (
                        <div className="absolute inset-0 flex items-center justify-center rounded bg-black bg-opacity-60 opacity-0 transition-opacity hover:opacity-100">
                          <Button
                            buttonType="primary"
                            buttonSize="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRequestAlbum(album);
                            }}
                            disabled={isRequesting}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>Request</span>
                          </Button>
                        </div>
                      )}
                      {isRequested && (
                        <div className="absolute top-2 right-2">
                          <div className="rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                            Requested
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <h3 className="line-clamp-2 text-sm font-medium text-white">
                        {album.title}
                      </h3>
                      {album.trackCount && (
                        <p className="text-xs text-gray-400">
                          {album.trackCount}{' '}
                          {album.trackCount === 1 ? 'track' : 'tracks'}
                        </p>
                      )}
                    </div>
                  </div>
                );

                // Both Lidarr and MusicBrainz albums are now clickable
                // Use foreignId (MBID) for MusicBrainz albums, numeric ID for Lidarr albums
                const linkHref = isLidarrAlbum
                  ? `/album/${album.id}`
                  : `/album/${album.foreignId}`;

                return (
                  <Link key={album.id} href={linkHref}>
                    <a className="block">{albumCard}</a>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistDetails;
