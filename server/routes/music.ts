import LidarrAPI from '@server/api/servarr/lidarr';
import { MediaType } from '@server/constants/media';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { mapAlbumResult, mapArtistResult } from '@server/models/Music';
import { Router } from 'express';

const musicRoutes = Router();

musicRoutes.get('/:artistId', async (req, res, next) => {
  const settings = getSettings();

  try {
    const lidarrSettings = settings.lidarr.find(
      (lidarr) => lidarr.isDefault
    );

    if (!lidarrSettings) {
      return next({
        status: 404,
        message: 'No Lidarr instance configured.',
      });
    }

    const lidarrApi = new LidarrAPI({
      url: LidarrAPI.buildUrl(lidarrSettings, '/api/v1'),
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

    const media = await Media.getRelatedMedia([artist.id]);

    return res.status(200).json(
      mapArtistResult(
        artist,
        media.find(
          (m) => m.tmdbId === artist.id && m.mediaType === MediaType.MUSIC
        )
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

musicRoutes.get('/:artistId/albums', async (req, res, next) => {
  const settings = getSettings();

  try {
    const lidarrSettings = settings.lidarr.find(
      (lidarr) => lidarr.isDefault
    );

    if (!lidarrSettings) {
      return next({
        status: 404,
        message: 'No Lidarr instance configured.',
      });
    }

    const lidarrApi = new LidarrAPI({
      url: LidarrAPI.buildUrl(lidarrSettings, '/api/v1'),
      apiKey: lidarrSettings.apiKey,
    });

    // Get albums by fetching the artist and reading their albums
    const artist = await lidarrApi.getArtist({
      id: Number(req.params.artistId),
    });

    if (!artist) {
      return next({
        status: 404,
        message: 'Artist not found.',
      });
    }

    // Lidarr artists don't directly have albums in the getArtist response
    // For now, return an empty array - albums would need to be fetched separately
    // from Lidarr's album endpoint with artistId filter
    return res.status(200).json([]);
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

export default musicRoutes;
