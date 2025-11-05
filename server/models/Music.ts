import type {
  LastfmAlbum,
  LastfmArtist,
  LastfmTrack,
} from '@server/api/lastfm/interfaces';
import type {
  MusicBrainzArtist,
  MusicBrainzReleaseGroup,
} from '@server/api/musicbrainz/interfaces';
import type { LidarrAlbum, LidarrArtist } from '@server/api/servarr/lidarr';
import type Media from '@server/entity/Media';

export type MusicMediaType = 'artist' | 'album' | 'track';

interface MusicSearchResult {
  id: number;
  mediaType: MusicMediaType;
  overview: string;
  posterPath?: string;
  mediaInfo?: Media;
}

export interface ArtistResult extends MusicSearchResult {
  mediaType: 'artist';
  name: string;
  foreignId: string;
  disambiguation?: string;
  artistType?: string;
  albumCount?: number;
}

export interface AlbumResult extends MusicSearchResult {
  mediaType: 'album';
  title: string;
  foreignId: string;
  artistId: number;
  artistName: string;
  artistForeignId?: string; // Artist MBID
  disambiguation?: string;
  albumType?: string;
  duration?: number;
  trackCount?: number;
}

export type MusicResults = ArtistResult | AlbumResult;

export const mapArtistResult = (
  artistResult: LidarrArtist,
  media?: Media,
  serverUrl?: string
): ArtistResult => {
  // Lidarr uses different coverTypes: 'poster', 'fanart', 'banner', 'logo', 'disc', 'unknown'
  // Try poster first, then fanart, then banner, or just use the first available image
  const posterImage =
    artistResult.images?.find((img) => img.coverType === 'poster') ||
    artistResult.images?.find((img) => img.coverType === 'fanart') ||
    artistResult.images?.find((img) => img.coverType === 'banner') ||
    artistResult.images?.[0];

  // Convert relative image URLs to full URLs
  let posterPath = posterImage?.url;
  if (posterPath && serverUrl && posterPath.startsWith('/')) {
    // Remove '/api/v1' from serverUrl if present, then append the image path
    const baseUrl = serverUrl.replace('/api/v1', '');
    posterPath = `${baseUrl}${posterPath}`;
  }

  return {
    id: artistResult.id,
    mediaType: 'artist',
    name: artistResult.artistName,
    foreignId: artistResult.foreignArtistId,
    overview: artistResult.overview || '',
    disambiguation: artistResult.disambiguation,
    artistType: artistResult.artistType,
    albumCount: artistResult.statistics?.albumCount,
    posterPath,
    mediaInfo: media,
  };
};

export const mapAlbumResult = (
  albumResult: LidarrAlbum,
  media?: Media,
  serverUrl?: string
): AlbumResult => {
  const coverImage = albumResult.images?.find(
    (img) => img.coverType === 'cover'
  );

  // Get track count from monitored release or first release
  // (albums can have multiple releases - vinyl, CD, remasters, etc.)
  const monitoredRelease =
    albumResult.releases?.find((r) => r.monitored) || albumResult.releases?.[0];
  const trackCount = monitoredRelease?.trackCount || 0;

  // Convert relative image URLs to full URLs
  let posterPath = coverImage?.url;
  if (posterPath && serverUrl && posterPath.startsWith('/')) {
    const baseUrl = serverUrl.replace('/api/v1', '');
    posterPath = `${baseUrl}${posterPath}`;
  }

  return {
    id: albumResult.id,
    mediaType: 'album',
    title: albumResult.title,
    foreignId: albumResult.foreignAlbumId,
    artistId: albumResult.artistId,
    artistName: albumResult.artist?.artistName || '',
    overview: albumResult.overview || '',
    disambiguation: albumResult.disambiguation,
    albumType: albumResult.albumType,
    duration: albumResult.duration,
    trackCount,
    posterPath,
    mediaInfo: media,
  };
};

// Helper to create a simple hash for Last.fm items (since they don't have numeric IDs)
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const mapLastfmArtistResult = (
  artist: LastfmArtist,
  media?: Media
): ArtistResult => {
  // Use MBID if available, otherwise hash the artist name
  const id = artist.mbid ? simpleHash(artist.mbid) : simpleHash(artist.name);

  // Get largest image
  const posterImage =
    artist.image?.find((img) => img.size === 'extralarge') ||
    artist.image?.find((img) => img.size === 'large') ||
    artist.image?.find((img) => img.size === 'medium');

  return {
    id,
    mediaType: 'artist',
    name: artist.name,
    // If no MBID, use artist name prefixed with 'name:' for routing to search endpoint
    foreignId: artist.mbid || `name:${artist.name}`,
    overview: '', // Last.fm doesn't provide overview in chart endpoints
    posterPath: posterImage?.['#text'],
    mediaInfo: media,
  };
};

export const mapLastfmAlbumResult = (
  album: LastfmAlbum,
  media?: Media
): AlbumResult => {
  // Use MBID if available, otherwise hash the album name + artist name
  const id = album.mbid
    ? simpleHash(album.mbid)
    : simpleHash(album.name + album.artist.name);

  const artistId = album.artist.mbid
    ? simpleHash(album.artist.mbid)
    : simpleHash(album.artist.name);

  // Get largest image from Last.fm
  const coverImage =
    album.image?.find((img) => img.size === 'extralarge') ||
    album.image?.find((img) => img.size === 'large') ||
    album.image?.find((img) => img.size === 'medium');

  const posterPath = coverImage?.['#text'];

  return {
    id,
    mediaType: 'album',
    title: album.name,
    foreignId: album.mbid || '',
    artistId,
    artistName: album.artist.name,
    overview: '', // Last.fm doesn't provide overview in chart endpoints
    posterPath,
    mediaInfo: media,
  };
};

export interface TrackResult extends MusicSearchResult {
  mediaType: 'track';
  title: string;
  foreignId: string;
  artistId: number;
  artistName: string;
  duration?: number;
}

export const mapLastfmTrackResult = (
  track: LastfmTrack,
  media?: Media
): TrackResult => {
  // Use MBID if available, otherwise hash the track name + artist name
  const id = track.mbid
    ? simpleHash(track.mbid)
    : simpleHash(track.name + track.artist.name);

  const artistId = track.artist.mbid
    ? simpleHash(track.artist.mbid)
    : simpleHash(track.artist.name);

  // Get largest image - tracks often don't have images in Last.fm
  const coverImage =
    track.image?.find((img) => img.size === 'extralarge') ||
    track.image?.find((img) => img.size === 'large') ||
    track.image?.find((img) => img.size === 'medium');

  return {
    id,
    mediaType: 'track',
    title: track.name,
    foreignId: track.mbid || '',
    artistId,
    artistName: track.artist.name,
    overview: '',
    duration: track.duration ? parseInt(track.duration, 10) : undefined,
    posterPath: coverImage?.['#text'],
    mediaInfo: media,
  };
};

export const mapMusicBrainzArtistResult = (
  artist: MusicBrainzArtist,
  posterPath?: string,
  media?: Media
): ArtistResult => {
  // Generate numeric ID from MBID for consistency
  const id = simpleHash(artist.id);

  // Extract bio/overview from tags if available
  const overview =
    artist.tags
      ?.slice(0, 5)
      .map((tag) => tag.name)
      .join(', ') || '';

  return {
    id,
    mediaType: 'artist',
    name: artist.name,
    foreignId: artist.id, // MBID
    overview,
    disambiguation: artist.disambiguation,
    artistType: artist.type,
    albumCount: artist['release-groups']?.length,
    posterPath,
    mediaInfo: media,
  };
};

export const mapMusicBrainzReleaseGroupResult = (
  releaseGroup: MusicBrainzReleaseGroup,
  artistId: number,
  artistName: string,
  coverArtUrl?: string,
  media?: Media,
  artistForeignId?: string
): AlbumResult => {
  // Generate numeric ID from MBID
  const id = simpleHash(releaseGroup.id);

  return {
    id,
    mediaType: 'album',
    title: releaseGroup.title,
    foreignId: releaseGroup.id, // MBID
    artistId,
    artistName,
    artistForeignId, // Artist MBID
    overview:
      releaseGroup.tags
        ?.slice(0, 3)
        .map((tag) => tag.name)
        .join(', ') || '',
    disambiguation: releaseGroup.disambiguation,
    albumType: releaseGroup['primary-type'],
    posterPath: coverArtUrl,
    mediaInfo: media,
  };
};
