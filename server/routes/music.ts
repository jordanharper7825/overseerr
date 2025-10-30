import LidarrAPI from '@server/api/servarr/lidarr';
import { MediaType } from '@server/constants/media';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { mapAlbumResult, mapArtistResult } from '@server/models/Music';
import { Router } from 'express';

const musicRoutes = Router();

// Specific routes must come before parameterized routes
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

    const albums = await lidarrApi.getAlbumsByArtist(
      Number(req.params.artistId)
    );

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
      id: Number(req.params.artistId),
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
