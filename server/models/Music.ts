import type {
  LidarrAlbum,
  LidarrArtist,
} from '@server/api/servarr/lidarr';
import type {
  LastfmAlbum,
  LastfmArtist,
  LastfmTrack,
} from '@server/api/lastfm/interfaces';
import { MediaType as MainMediaType } from '@server/constants/media';
import type Media from '@server/entity/Media';

export type MusicMediaType = 'artist' | 'album';

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
  const coverImage = albumResult.images?.find((img) => img.coverType === 'cover');

  // Get track count from monitored release or first release
  // (albums can have multiple releases - vinyl, CD, remasters, etc.)
  const monitoredRelease =
    albumResult.releases?.find((r) => r.monitored) ||
    albumResult.releases?.[0];
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
    foreignId: artist.mbid || '',
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

  // Get largest image
  const coverImage =
    album.image?.find((img) => img.size === 'extralarge') ||
    album.image?.find((img) => img.size === 'large') ||
    album.image?.find((img) => img.size === 'medium');

  return {
    id,
    mediaType: 'album',
    title: album.name,
    foreignId: album.mbid || '',
    artistId,
    artistName: album.artist.name,
    overview: '', // Last.fm doesn't provide overview in chart endpoints
    posterPath: coverImage?.['#text'],
    mediaInfo: media,
  };
};

export interface TrackResult extends MusicSearchResult {
  mediaType: 'album'; // Tracks are represented as albums in our UI
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

  // Get largest image
  const coverImage =
    track.image?.find((img) => img.size === 'extralarge') ||
    track.image?.find((img) => img.size === 'large') ||
    track.image?.find((img) => img.size === 'medium');

  return {
    id,
    mediaType: 'album', // Represent tracks as albums for UI consistency
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
