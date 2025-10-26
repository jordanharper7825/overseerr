import LidarrAPI from '@server/api/servarr/lidarr';
import type { LidarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { Router } from 'express';

const lidarrRoutes = Router();

lidarrRoutes.get('/', (req, res) => {
  const settings = getSettings();

  res.status(200).json(settings.lidarr);
});

lidarrRoutes.post('/', async (req, res, next) => {
  try {
    const settings = getSettings();
    const newLidarr = req.body as LidarrSettings;

    const lastId =
      settings.lidarr.length > 0
        ? settings.lidarr[settings.lidarr.length - 1].id
        : 0;
    newLidarr.id = lastId + 1;

    settings.lidarr = [...settings.lidarr, newLidarr];
    settings.save();

    return res.status(201).json(newLidarr);
  } catch (e) {
    next({ status: 500, message: e.message });
  }
});

lidarrRoutes.post('/test', async (req, res, next) => {
  try {
    const testSettings = req.body as LidarrSettings;

    const lidarr = new LidarrAPI({
      apiKey: testSettings.apiKey,
      url: LidarrAPI.buildUrl(testSettings, '/api/v1'),
    });

    const profiles = await lidarr.getProfiles();
    const rootFolders = await lidarr.getRootFolders();
    const metadataProfiles = await lidarr.getMetadataProfiles();
    const tags = await lidarr.getTags();

    return res.status(200).json({
      profiles,
      rootFolders,
      metadataProfiles,
      tags,
      urlBase: testSettings.baseUrl,
    });
  } catch (e) {
    logger.error('Failed to test Lidarr connection', {
      label: 'Lidarr',
      errorMessage: e.message,
    });
    next({ status: 500, message: 'Failed to connect to Lidarr' });
  }
});

lidarrRoutes.put('/:id', async (req, res, next) => {
  try {
    const settings = getSettings();
    const lidarrId = Number(req.params.id);
    const lidarrIndex = settings.lidarr.findIndex((l) => l.id === lidarrId);

    if (lidarrIndex === -1) {
      return next({ status: 404, message: 'Lidarr server not found' });
    }

    settings.lidarr[lidarrIndex] = {
      ...req.body,
      id: lidarrId,
    } as LidarrSettings;
    settings.save();

    return res.status(200).json(settings.lidarr[lidarrIndex]);
  } catch (e) {
    next({ status: 500, message: e.message });
  }
});

lidarrRoutes.delete('/:id', async (req, res, next) => {
  try {
    const settings = getSettings();
    const lidarrId = Number(req.params.id);
    const lidarrIndex = settings.lidarr.findIndex((l) => l.id === lidarrId);

    if (lidarrIndex === -1) {
      return next({ status: 404, message: 'Lidarr server not found' });
    }

    settings.lidarr = settings.lidarr.filter((l) => l.id !== lidarrId);
    settings.save();

    return res.status(204).send();
  } catch (e) {
    next({ status: 500, message: e.message });
  }
});

lidarrRoutes.get('/:id/profiles', async (req, res, next) => {
  try {
    const settings = getSettings();
    const lidarrId = Number(req.params.id);
    const lidarrSettings = settings.lidarr.find((l) => l.id === lidarrId);

    if (!lidarrSettings) {
      return next({ status: 404, message: 'Lidarr server not found' });
    }

    const lidarr = new LidarrAPI({
      apiKey: lidarrSettings.apiKey,
      url: LidarrAPI.buildUrl(lidarrSettings, '/api/v1'),
    });

    const profiles = await lidarr.getProfiles();

    return res.status(200).json(
      profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
      }))
    );
  } catch (e) {
    logger.error('Failed to get Lidarr profiles', {
      label: 'Lidarr',
      errorMessage: e.message,
    });
    next({ status: 500, message: 'Failed to get Lidarr profiles' });
  }
});

lidarrRoutes.get('/:id/metadataprofiles', async (req, res, next) => {
  try {
    const settings = getSettings();
    const lidarrId = Number(req.params.id);
    const lidarrSettings = settings.lidarr.find((l) => l.id === lidarrId);

    if (!lidarrSettings) {
      return next({ status: 404, message: 'Lidarr server not found' });
    }

    const lidarr = new LidarrAPI({
      apiKey: lidarrSettings.apiKey,
      url: LidarrAPI.buildUrl(lidarrSettings, '/api/v1'),
    });

    const profiles = await lidarr.getMetadataProfiles();

    return res.status(200).json(
      profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
      }))
    );
  } catch (e) {
    logger.error('Failed to get Lidarr metadata profiles', {
      label: 'Lidarr',
      errorMessage: e.message,
    });
    next({ status: 500, message: 'Failed to get Lidarr metadata profiles' });
  }
});

export default lidarrRoutes;
