import LidarrAPI from '@server/api/servarr/lidarr';
import TheMovieDb from '@server/api/themoviedb';
import type { TmdbSearchMultiResponse } from '@server/api/themoviedb/interfaces';
import Media from '@server/entity/Media';
import { findSearchProvider } from '@server/lib/search';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { mapAlbumResult, mapArtistResult } from '@server/models/Music';
import { mapSearchResults } from '@server/models/Search';
import { Router } from 'express';

const searchRoutes = Router();

searchRoutes.get('/', async (req, res, next) => {
  const queryString = req.query.query as string;
  const searchProvider = findSearchProvider(queryString.toLowerCase());
  let results: TmdbSearchMultiResponse;

  try {
    if (searchProvider) {
      const [id] = queryString
        .toLowerCase()
        .match(searchProvider.pattern) as RegExpMatchArray;
      results = await searchProvider.search({
        id,
        language: (req.query.language as string) ?? req.locale,
        query: queryString,
      });
    } else {
      const tmdb = new TheMovieDb();

      results = await tmdb.searchMulti({
        query: queryString,
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
      });
    }

    const media = await Media.getRelatedMedia(
      results.results.map((result) => result.id)
    );

    return res.status(200).json({
      page: results.page,
      totalPages: results.total_pages,
      totalResults: results.total_results,
      results: mapSearchResults(results.results, media),
    });
  } catch (e) {
    logger.debug('Something went wrong retrieving search results', {
      label: 'API',
      errorMessage: e.message,
      query: req.query.query,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve search results.',
    });
  }
});

searchRoutes.get('/keyword', async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const results = await tmdb.searchKeyword({
      query: req.query.query as string,
      page: Number(req.query.page),
    });

    return res.status(200).json(results);
  } catch (e) {
    logger.debug('Something went wrong retrieving keyword search results', {
      label: 'API',
      errorMessage: e.message,
      query: req.query.query,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve keyword search results.',
    });
  }
});

searchRoutes.get('/company', async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const results = await tmdb.searchCompany({
      query: req.query.query as string,
      page: Number(req.query.page),
    });

    return res.status(200).json(results);
  } catch (e) {
    logger.debug('Something went wrong retrieving company search results', {
      label: 'API',
      errorMessage: e.message,
      query: req.query.query,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve company search results.',
    });
  }
});

searchRoutes.get('/music', async (req, res, next) => {
  const settings = getSettings();

  try {
    const lidarrSettings = settings.lidarr.find((lidarr) => lidarr.isDefault);

    if (!lidarrSettings) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    const apiUrl = LidarrAPI.buildUrl(lidarrSettings, '/api/v1');
    const lidarrApi = new LidarrAPI({
      url: apiUrl,
      apiKey: lidarrSettings.apiKey,
    });

    const queryString = req.query.query as string;

    // Search for both artists and albums
    const [artists, albums] = await Promise.all([
      lidarrApi.searchArtist(queryString),
      lidarrApi.searchAlbum(queryString),
    ]);

    const mappedArtists = artists.map((artist) =>
      mapArtistResult(artist, undefined, apiUrl)
    );

    const mappedAlbums = albums.map((album) => mapAlbumResult(album, undefined, apiUrl));

    const results = [...mappedArtists, ...mappedAlbums];

    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: results.length,
      results,
    });
  } catch (e) {
    logger.debug('Something went wrong retrieving music search results', {
      label: 'API',
      errorMessage: e.message,
      query: req.query.query,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve music search results.',
    });
  }
});

export default searchRoutes;
