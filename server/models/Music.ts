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
  media?: Media
): ArtistResult => {
  const posterImage = artistResult.images?.find(
    (img) => img.coverType === 'poster'
  );

  return {
    id: artistResult.id,
    mediaType: 'artist',
    name: artistResult.artistName,
    foreignId: artistResult.foreignArtistId,
    overview: artistResult.overview || '',
    disambiguation: artistResult.disambiguation,
    artistType: artistResult.artistType,
    albumCount: artistResult.statistics?.albumCount,
    posterPath: posterImage?.url,
    mediaInfo: media,
  };
};

export const mapAlbumResult = (
  albumResult: LidarrAlbum,
  media?: Media
): AlbumResult => {
  const coverImage = albumResult.images?.find((img) => img.coverType === 'cover');

  // Calculate total track count from releases
  const totalTracks = albumResult.releases?.reduce(
    (sum, release) => sum + (release.trackCount || 0),
    0
  );

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
    trackCount: totalTracks,
    posterPath: coverImage?.url,
    mediaInfo: media,
  };
};
