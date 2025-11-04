import LastfmAPI from '@server/api/lastfm';
import MusicBrainzAPI from '@server/api/musicbrainz';
import LidarrAPI from '@server/api/servarr/lidarr';
import { MediaType } from '@server/constants/media';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import {
  mapAlbumResult,
  mapArtistResult,
  mapMusicBrainzArtistResult,
  mapMusicBrainzReleaseGroupResult,
} from '@server/models/Music';
import { Router } from 'express';

const musicRoutes = Router();

// Helper function to check if a string is a valid MBID (UUID format)
const isMBID = (str: string): boolean => {
  const mbidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return mbidRegex.test(str);
};

// Specific routes must come before parameterized routes
// Artist search/lookup by name (for Last.fm artists without MBIDs)
musicRoutes.get('/search/:artistName', async (req, res, next) => {
  const artistName = decodeURIComponent(req.params.artistName);
  const settings = getSettings();

  try {
    const musicbrainz = new MusicBrainzAPI();
    let mbid: string | undefined;
    let posterPath: string | undefined;

    // Try to get artist info from Last.fm for MBID and image
    if (settings.lastfm.apiKey) {
      try {
        const lastfm = new LastfmAPI(settings.lastfm.apiKey);
        const artistInfo = await lastfm.getArtistInfo(artistName);

        mbid = artistInfo.artist.mbid;
        const posterImage =
          artistInfo.artist.image?.find((img) => img.size === 'extralarge') ||
          artistInfo.artist.image?.find((img) => img.size === 'large');
        posterPath = posterImage?.['#text'];
      } catch (e) {
        logger.debug('Could not fetch artist from Last.fm', {
          label: 'API',
          artistName,
        });
      }
    }

    // If we have an MBID from Last.fm, use it directly
    if (mbid) {
      const artistData = await musicbrainz.getArtist(mbid);
      return res
        .status(200)
        .json(mapMusicBrainzArtistResult(artistData.artist, posterPath));
    }

    // Otherwise, search MusicBrainz by name
    const searchResults = await musicbrainz.searchArtists(artistName, 1);

    if (!searchResults.artists || searchResults.artists.length === 0) {
      return next({
        status: 404,
        message: 'Artist not found.',
      });
    }

    // Use the first search result
    const artist = searchResults.artists[0];
    const artistData = await musicbrainz.getArtist(artist.id);

    return res
      .status(200)
      .json(mapMusicBrainzArtistResult(artistData.artist, posterPath));
  } catch (e) {
    logger.error('Something went wrong searching for artist', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
      artistName,
    });
    return next({
      status: 500,
      message: 'Unable to find artist.',
    });
  }
});

// MusicBrainz artist route (handles MBID format)
musicRoutes.get('/mbid/:mbid', async (req, res, next) => {
  const mbid = req.params.mbid;

  if (!isMBID(mbid)) {
    return next({
      status: 400,
      message: 'Invalid MBID format.',
    });
  }

  try {
    const musicbrainz = new MusicBrainzAPI();
    const settings = getSettings();

    // Fetch artist details from MusicBrainz
    const artistData = await musicbrainz.getArtist(mbid);
    const artist = artistData.artist;

    // Try to get artist image from Last.fm if API key is configured
    let posterPath: string | undefined;
    if (settings.lastfm.apiKey) {
      try {
        const lastfm = new LastfmAPI(settings.lastfm.apiKey);
        const artistInfo = await lastfm.getArtistInfo(artist.name, mbid);

        const posterImage =
          artistInfo.artist.image?.find((img) => img.size === 'extralarge') ||
          artistInfo.artist.image?.find((img) => img.size === 'large');

        posterPath = posterImage?.['#text'];
      } catch (e) {
        logger.debug('Could not fetch artist image from Last.fm', {
          label: 'API',
          artistName: artist.name,
        });
      }
    }

    return res
      .status(200)
      .json(mapMusicBrainzArtistResult(artist, posterPath));
  } catch (e) {
    logger.error('Something went wrong retrieving artist from MusicBrainz', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
      mbid,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve artist from MusicBrainz.',
    });
  }
});

// MusicBrainz artist albums route
musicRoutes.get('/mbid/:mbid/albums', async (req, res, next) => {
  const mbid = req.params.mbid;

  if (!isMBID(mbid)) {
    return next({
      status: 400,
      message: 'Invalid MBID format.',
    });
  }

  try {
    const musicbrainz = new MusicBrainzAPI();

    // Fetch artist details first to get the artist name
    const artistData = await musicbrainz.getArtist(mbid);
    const artist = artistData.artist;

    // Fetch release groups (albums, singles, etc.)
    const releaseGroupsData = await musicbrainz.getArtistReleaseGroups(mbid, {
      type: ['album', 'ep'],
      limit: 100,
    });

    // Generate artist ID from MBID for consistency
    const simpleHash = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    const artistId = simpleHash(mbid);

    const mappedAlbums = releaseGroupsData['release-groups'].map(
      (releaseGroup) =>
        mapMusicBrainzReleaseGroupResult(
          releaseGroup,
          artistId,
          artist.name,
          undefined // We don't have cover art URLs from MusicBrainz directly
        )
    );

    return res.status(200).json(mappedAlbums);
  } catch (e) {
    logger.error(
      'Something went wrong retrieving albums from MusicBrainz',
      {
        label: 'API',
        errorMessage: e instanceof Error ? e.message : String(e),
        mbid,
      }
    );
    return next({
      status: 500,
      message: 'Unable to retrieve albums from MusicBrainz.',
    });
  }
});

musicRoutes.get('/album/:albumId', async (req, res, next) => {
  const settings = getSettings();

  try {
    const lidarrSettings = settings.lidarr.find((lidarr) => lidarr.isDefault);

    if (!lidarrSettings) {
      return next({
        status: 404,
        message: 'No Lidarr instance configured.',
      });
    }

    const apiUrl = LidarrAPI.buildUrl(lidarrSettings, '/api/v1');
    const lidarrApi = new LidarrAPI({
      url: apiUrl,
      apiKey: lidarrSettings.apiKey,
    });

    const album = await lidarrApi.getAlbum(Number(req.params.albumId));

    if (!album) {
      return next({
        status: 404,
        message: 'Album not found.',
      });
    }

    return res.status(200).json(mapAlbumResult(album, undefined, apiUrl));
  } catch (e) {
    logger.debug('Something went wrong retrieving album', {
      label: 'API',
      errorMessage: e.message,
      albumId: req.params.albumId,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve album.',
    });
  }
});

musicRoutes.get('/album/:albumId/tracks', async (req, res, next) => {
  const settings = getSettings();

  try {
    const lidarrSettings = settings.lidarr.find((lidarr) => lidarr.isDefault);

    if (!lidarrSettings) {
      return next({
        status: 404,
        message: 'No Lidarr instance configured.',
      });
    }

    const apiUrl = LidarrAPI.buildUrl(lidarrSettings, '/api/v1');
    const lidarrApi = new LidarrAPI({
      url: apiUrl,
      apiKey: lidarrSettings.apiKey,
    });

    const tracks = await lidarrApi.getTracks(Number(req.params.albumId));

    return res.status(200).json(tracks);
  } catch (e) {
    logger.debug('Something went wrong retrieving tracks for album', {
      label: 'API',
      errorMessage: e.message,
      albumId: req.params.albumId,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve tracks for album.',
    });
  }
});

musicRoutes.get('/:artistId/albums', async (req, res, next) => {
  const settings = getSettings();

  try {
    // Only accept numeric IDs for this route (Lidarr artists)
    const artistId = Number(req.params.artistId);
    if (isNaN(artistId)) {
      return next({
        status: 400,
        message: 'Invalid artist ID format.',
      });
    }

    const lidarrSettings = settings.lidarr.find((lidarr) => lidarr.isDefault);

    if (!lidarrSettings) {
      return next({
        status: 404,
        message: 'No Lidarr instance configured.',
      });
    }

    const apiUrl = LidarrAPI.buildUrl(lidarrSettings, '/api/v1');
    const lidarrApi = new LidarrAPI({
      url: apiUrl,
      apiKey: lidarrSettings.apiKey,
    });

    const albums = await lidarrApi.getAlbumsByArtist(artistId);

    const mappedAlbums = albums.map((album) =>
      mapAlbumResult(album, undefined, apiUrl)
    );

    return res.status(200).json(mappedAlbums);
  } catch (e) {
    logger.debug('Something went wrong retrieving albums for artist', {
      label: 'API',
      errorMessage: e.message,
      artistId: req.params.artistId,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve albums for artist.',
    });
  }
});

musicRoutes.get('/:artistId', async (req, res, next) => {
  const settings = getSettings();

  try {
    // Only accept numeric IDs for this route (Lidarr artists)
    const artistId = Number(req.params.artistId);
    if (isNaN(artistId)) {
      return next({
        status: 400,
        message: 'Invalid artist ID format.',
      });
    }

    const lidarrSettings = settings.lidarr.find((lidarr) => lidarr.isDefault);

    if (!lidarrSettings) {
      return next({
        status: 404,
        message: 'No Lidarr instance configured.',
      });
    }

    const apiUrl = LidarrAPI.buildUrl(lidarrSettings, '/api/v1');
    const lidarrApi = new LidarrAPI({
      url: apiUrl,
      apiKey: lidarrSettings.apiKey,
    });

    const artist = await lidarrApi.getArtist({
      id: artistId,
    });

    if (!artist) {
      return next({
        status: 404,
        message: 'Artist not found.',
      });
    }

    logger.info('Artist data from Lidarr', {
      label: 'API',
      artistName: artist.artistName,
      hasOverview: !!artist.overview,
      overviewLength: artist.overview?.length || 0,
      overview: artist.overview?.substring(0, 100),
    });

    const media = await Media.getRelatedMedia([artist.id]);

    return res.status(200).json(
      mapArtistResult(
        artist,
        media.find(
          (m) => m.tmdbId === artist.id && m.mediaType === MediaType.MUSIC
        ),
        apiUrl
      )
    );
  } catch (e) {
    logger.debug('Something went wrong retrieving artist', {
      label: 'API',
      errorMessage: e.message,
      artistId: req.params.artistId,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve artist.',
    });
  }
});

export default musicRoutes;
