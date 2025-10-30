import type {
  LidarrAlbum,
  LidarrArtist,
} from '@server/api/servarr/lidarr';
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
