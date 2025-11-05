import LastfmAPI from '@server/api/lastfm';
import PlexTvAPI from '@server/api/plextv';
import LidarrAPI from '@server/api/servarr/lidarr';
import type { SortOptions } from '@server/api/themoviedb';
import TheMovieDb from '@server/api/themoviedb';
import type { TmdbKeyword } from '@server/api/themoviedb/interfaces';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { User } from '@server/entity/User';
import type {
  GenreSliderItem,
  WatchlistResponse,
} from '@server/interfaces/api/discoverInterfaces';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { mapProductionCompany } from '@server/models/Movie';
import {
  mapAlbumResult,
  mapArtistResult,
  mapLastfmAlbumResult,
  mapLastfmArtistResult,
  mapLastfmTrackResult,
} from '@server/models/Music';
import {
  mapCollectionResult,
  mapMovieResult,
  mapPersonResult,
  mapTvResult,
} from '@server/models/Search';
import { mapNetwork } from '@server/models/Tv';
import { isCollection, isMovie, isPerson } from '@server/utils/typeHelpers';
import { Router } from 'express';
import { sortBy } from 'lodash';
import { z } from 'zod';

export const createTmdbWithRegionLanguage = (user?: User): TheMovieDb => {
  const settings = getSettings();

  const region =
    user?.settings?.region === 'all'
      ? ''
      : user?.settings?.region
      ? user?.settings?.region
      : settings.main.region;

  const originalLanguage =
    user?.settings?.originalLanguage === 'all'
      ? ''
      : user?.settings?.originalLanguage
      ? user?.settings?.originalLanguage
      : settings.main.originalLanguage;

  return new TheMovieDb({
    region,
    originalLanguage,
  });
};

const discoverRoutes = Router();

const QueryFilterOptions = z.object({
  page: z.coerce.string().optional(),
  sortBy: z.coerce.string().optional(),
  primaryReleaseDateGte: z.coerce.string().optional(),
  primaryReleaseDateLte: z.coerce.string().optional(),
  firstAirDateGte: z.coerce.string().optional(),
  firstAirDateLte: z.coerce.string().optional(),
  studio: z.coerce.string().optional(),
  genre: z.coerce.string().optional(),
  keywords: z.coerce.string().optional(),
  language: z.coerce.string().optional(),
  withRuntimeGte: z.coerce.string().optional(),
  withRuntimeLte: z.coerce.string().optional(),
  voteAverageGte: z.coerce.string().optional(),
  voteAverageLte: z.coerce.string().optional(),
  voteCountGte: z.coerce.string().optional(),
  voteCountLte: z.coerce.string().optional(),
  network: z.coerce.string().optional(),
  watchProviders: z.coerce.string().optional(),
  watchRegion: z.coerce.string().optional(),
});

export type FilterOptions = z.infer<typeof QueryFilterOptions>;

discoverRoutes.get('/movies', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage(req.user);

  try {
    const query = QueryFilterOptions.parse(req.query);
    const keywords = query.keywords;
    const data = await tmdb.getDiscoverMovies({
      page: Number(query.page),
      sortBy: query.sortBy as SortOptions,
      language: req.locale ?? query.language,
      originalLanguage: query.language,
      genre: query.genre,
      studio: query.studio,
      primaryReleaseDateLte: query.primaryReleaseDateLte
        ? new Date(query.primaryReleaseDateLte).toISOString().split('T')[0]
        : undefined,
      primaryReleaseDateGte: query.primaryReleaseDateGte
        ? new Date(query.primaryReleaseDateGte).toISOString().split('T')[0]
        : undefined,
      keywords,
      withRuntimeGte: query.withRuntimeGte,
      withRuntimeLte: query.withRuntimeLte,
      voteAverageGte: query.voteAverageGte,
      voteAverageLte: query.voteAverageLte,
      voteCountGte: query.voteCountGte,
      voteCountLte: query.voteCountLte,
      watchProviders: query.watchProviders,
      watchRegion: query.watchRegion,
    });

    const media = await Media.getRelatedMedia(
      data.results.map((result) => result.id)
    );

    let keywordData: TmdbKeyword[] = [];
    if (keywords) {
      const splitKeywords = keywords.split(',');

      keywordData = await Promise.all(
        splitKeywords.map(async (keywordId) => {
          return await tmdb.getKeywordDetails({ keywordId: Number(keywordId) });
        })
      );
    }

    return res.status(200).json({
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      keywords: keywordData,
      results: data.results.map((result) =>
        mapMovieResult(
          result,
          media.find(
            (req) =>
              req.tmdbId === result.id && req.mediaType === MediaType.MOVIE
          )
        )
      ),
    });
  } catch (e) {
    logger.debug('Something went wrong retrieving popular movies', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve popular movies.',
    });
  }
});

discoverRoutes.get<{ language: string }>(
  '/movies/language/:language',
  async (req, res, next) => {
    const tmdb = createTmdbWithRegionLanguage(req.user);

    try {
      const languages = await tmdb.getLanguages();

      const language = languages.find(
        (lang) => lang.iso_639_1 === req.params.language
      );

      if (!language) {
        return next({ status: 404, message: 'Language not found.' });
      }

      const data = await tmdb.getDiscoverMovies({
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
        originalLanguage: req.params.language,
      });

      const media = await Media.getRelatedMedia(
        data.results.map((result) => result.id)
      );

      return res.status(200).json({
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        language,
        results: data.results.map((result) =>
          mapMovieResult(
            result,
            media.find(
              (req) =>
                req.tmdbId === result.id && req.mediaType === MediaType.MOVIE
            )
          )
        ),
      });
    } catch (e) {
      logger.debug('Something went wrong retrieving movies by language', {
        label: 'API',
        errorMessage: e.message,
        language: req.params.language,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve movies by language.',
      });
    }
  }
);

discoverRoutes.get<{ genreId: string }>(
  '/movies/genre/:genreId',
  async (req, res, next) => {
    const tmdb = createTmdbWithRegionLanguage(req.user);

    try {
      const genres = await tmdb.getMovieGenres({
        language: (req.query.language as string) ?? req.locale,
      });

      const genre = genres.find(
        (genre) => genre.id === Number(req.params.genreId)
      );

      if (!genre) {
        return next({ status: 404, message: 'Genre not found.' });
      }

      const data = await tmdb.getDiscoverMovies({
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
        genre: req.params.genreId as string,
      });

      const media = await Media.getRelatedMedia(
        data.results.map((result) => result.id)
      );

      return res.status(200).json({
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        genre,
        results: data.results.map((result) =>
          mapMovieResult(
            result,
            media.find(
              (req) =>
                req.tmdbId === result.id && req.mediaType === MediaType.MOVIE
            )
          )
        ),
      });
    } catch (e) {
      logger.debug('Something went wrong retrieving movies by genre', {
        label: 'API',
        errorMessage: e.message,
        genreId: req.params.genreId,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve movies by genre.',
      });
    }
  }
);

discoverRoutes.get<{ studioId: string }>(
  '/movies/studio/:studioId',
  async (req, res, next) => {
    const tmdb = new TheMovieDb();

    try {
      const studio = await tmdb.getStudio(Number(req.params.studioId));

      const data = await tmdb.getDiscoverMovies({
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
        studio: req.params.studioId as string,
      });

      const media = await Media.getRelatedMedia(
        data.results.map((result) => result.id)
      );

      return res.status(200).json({
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        studio: mapProductionCompany(studio),
        results: data.results.map((result) =>
          mapMovieResult(
            result,
            media.find(
              (med) =>
                med.tmdbId === result.id && med.mediaType === MediaType.MOVIE
            )
          )
        ),
      });
    } catch (e) {
      logger.debug('Something went wrong retrieving movies by studio', {
        label: 'API',
        errorMessage: e.message,
        studioId: req.params.studioId,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve movies by studio.',
      });
    }
  }
);

discoverRoutes.get('/movies/upcoming', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage(req.user);

  const now = new Date();
  const offset = now.getTimezoneOffset();
  const date = new Date(now.getTime() - offset * 60 * 1000)
    .toISOString()
    .split('T')[0];

  try {
    const data = await tmdb.getDiscoverMovies({
      page: Number(req.query.page),
      language: (req.query.language as string) ?? req.locale,
      primaryReleaseDateGte: date,
    });

    const media = await Media.getRelatedMedia(
      data.results.map((result) => result.id)
    );

    return res.status(200).json({
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results: data.results.map((result) =>
        mapMovieResult(
          result,
          media.find(
            (med) =>
              med.tmdbId === result.id && med.mediaType === MediaType.MOVIE
          )
        )
      ),
    });
  } catch (e) {
    logger.debug('Something went wrong retrieving upcoming movies', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve upcoming movies.',
    });
  }
});

discoverRoutes.get('/tv', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage(req.user);

  try {
    const query = QueryFilterOptions.parse(req.query);
    const keywords = query.keywords;
    const data = await tmdb.getDiscoverTv({
      page: Number(query.page),
      sortBy: query.sortBy as SortOptions,
      language: req.locale ?? query.language,
      genre: query.genre,
      network: query.network ? Number(query.network) : undefined,
      firstAirDateLte: query.firstAirDateLte
        ? new Date(query.firstAirDateLte).toISOString().split('T')[0]
        : undefined,
      firstAirDateGte: query.firstAirDateGte
        ? new Date(query.firstAirDateGte).toISOString().split('T')[0]
        : undefined,
      originalLanguage: query.language,
      keywords,
      withRuntimeGte: query.withRuntimeGte,
      withRuntimeLte: query.withRuntimeLte,
      voteAverageGte: query.voteAverageGte,
      voteAverageLte: query.voteAverageLte,
      voteCountGte: query.voteCountGte,
      voteCountLte: query.voteCountLte,
      watchProviders: query.watchProviders,
      watchRegion: query.watchRegion,
    });

    const media = await Media.getRelatedMedia(
      data.results.map((result) => result.id)
    );

    let keywordData: TmdbKeyword[] = [];
    if (keywords) {
      const splitKeywords = keywords.split(',');

      keywordData = await Promise.all(
        splitKeywords.map(async (keywordId) => {
          return await tmdb.getKeywordDetails({ keywordId: Number(keywordId) });
        })
      );
    }

    return res.status(200).json({
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      keywords: keywordData,
      results: data.results.map((result) =>
        mapTvResult(
          result,
          media.find(
            (med) => med.tmdbId === result.id && med.mediaType === MediaType.TV
          )
        )
      ),
    });
  } catch (e) {
    logger.debug('Something went wrong retrieving popular series', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve popular series.',
    });
  }
});

discoverRoutes.get<{ language: string }>(
  '/tv/language/:language',
  async (req, res, next) => {
    const tmdb = createTmdbWithRegionLanguage(req.user);

    try {
      const languages = await tmdb.getLanguages();

      const language = languages.find(
        (lang) => lang.iso_639_1 === req.params.language
      );

      if (!language) {
        return next({ status: 404, message: 'Language not found.' });
      }

      const data = await tmdb.getDiscoverTv({
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
        originalLanguage: req.params.language,
      });

      const media = await Media.getRelatedMedia(
        data.results.map((result) => result.id)
      );

      return res.status(200).json({
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        language,
        results: data.results.map((result) =>
          mapTvResult(
            result,
            media.find(
              (med) =>
                med.tmdbId === result.id && med.mediaType === MediaType.TV
            )
          )
        ),
      });
    } catch (e) {
      logger.debug('Something went wrong retrieving series by language', {
        label: 'API',
        errorMessage: e.message,
        language: req.params.language,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve series by language.',
      });
    }
  }
);

discoverRoutes.get<{ genreId: string }>(
  '/tv/genre/:genreId',
  async (req, res, next) => {
    const tmdb = createTmdbWithRegionLanguage(req.user);

    try {
      const genres = await tmdb.getTvGenres({
        language: (req.query.language as string) ?? req.locale,
      });

      const genre = genres.find(
        (genre) => genre.id === Number(req.params.genreId)
      );

      if (!genre) {
        return next({ status: 404, message: 'Genre not found.' });
      }

      const data = await tmdb.getDiscoverTv({
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
        genre: req.params.genreId,
      });

      const media = await Media.getRelatedMedia(
        data.results.map((result) => result.id)
      );

      return res.status(200).json({
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        genre,
        results: data.results.map((result) =>
          mapTvResult(
            result,
            media.find(
              (med) =>
                med.tmdbId === result.id && med.mediaType === MediaType.TV
            )
          )
        ),
      });
    } catch (e) {
      logger.debug('Something went wrong retrieving series by genre', {
        label: 'API',
        errorMessage: e.message,
        genreId: req.params.genreId,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve series by genre.',
      });
    }
  }
);

discoverRoutes.get<{ networkId: string }>(
  '/tv/network/:networkId',
  async (req, res, next) => {
    const tmdb = new TheMovieDb();

    try {
      const network = await tmdb.getNetwork(Number(req.params.networkId));

      const data = await tmdb.getDiscoverTv({
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
        network: Number(req.params.networkId),
      });

      const media = await Media.getRelatedMedia(
        data.results.map((result) => result.id)
      );

      return res.status(200).json({
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        network: mapNetwork(network),
        results: data.results.map((result) =>
          mapTvResult(
            result,
            media.find(
              (med) =>
                med.tmdbId === result.id && med.mediaType === MediaType.TV
            )
          )
        ),
      });
    } catch (e) {
      logger.debug('Something went wrong retrieving series by network', {
        label: 'API',
        errorMessage: e.message,
        networkId: req.params.networkId,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve series by network.',
      });
    }
  }
);

discoverRoutes.get('/tv/upcoming', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage(req.user);

  const now = new Date();
  const offset = now.getTimezoneOffset();
  const date = new Date(now.getTime() - offset * 60 * 1000)
    .toISOString()
    .split('T')[0];

  try {
    const data = await tmdb.getDiscoverTv({
      page: Number(req.query.page),
      language: (req.query.language as string) ?? req.locale,
      firstAirDateGte: date,
    });

    const media = await Media.getRelatedMedia(
      data.results.map((result) => result.id)
    );

    return res.status(200).json({
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results: data.results.map((result) =>
        mapTvResult(
          result,
          media.find(
            (med) => med.tmdbId === result.id && med.mediaType === MediaType.TV
          )
        )
      ),
    });
  } catch (e) {
    logger.debug('Something went wrong retrieving upcoming series', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve upcoming series.',
    });
  }
});

discoverRoutes.get('/trending', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage(req.user);

  try {
    const data = await tmdb.getAllTrending({
      page: Number(req.query.page),
      language: (req.query.language as string) ?? req.locale,
    });

    const media = await Media.getRelatedMedia(
      data.results.map((result) => result.id)
    );

    return res.status(200).json({
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results: data.results.map((result) =>
        isMovie(result)
          ? mapMovieResult(
              result,
              media.find(
                (med) =>
                  med.tmdbId === result.id && med.mediaType === MediaType.MOVIE
              )
            )
          : isPerson(result)
          ? mapPersonResult(result)
          : isCollection(result)
          ? mapCollectionResult(result)
          : mapTvResult(
              result,
              media.find(
                (med) =>
                  med.tmdbId === result.id && med.mediaType === MediaType.TV
              )
            )
      ),
    });
  } catch (e) {
    logger.debug('Something went wrong retrieving trending items', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve trending items.',
    });
  }
});

discoverRoutes.get<{ keywordId: string }>(
  '/keyword/:keywordId/movies',
  async (req, res, next) => {
    const tmdb = new TheMovieDb();

    try {
      const data = await tmdb.getMoviesByKeyword({
        keywordId: Number(req.params.keywordId),
        page: Number(req.query.page),
        language: (req.query.language as string) ?? req.locale,
      });

      const media = await Media.getRelatedMedia(
        data.results.map((result) => result.id)
      );

      return res.status(200).json({
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        results: data.results.map((result) =>
          mapMovieResult(
            result,
            media.find(
              (med) =>
                med.tmdbId === result.id && med.mediaType === MediaType.MOVIE
            )
          )
        ),
      });
    } catch (e) {
      logger.debug('Something went wrong retrieving movies by keyword', {
        label: 'API',
        errorMessage: e.message,
        keywordId: req.params.keywordId,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve movies by keyword.',
      });
    }
  }
);

discoverRoutes.get<{ language: string }, GenreSliderItem[]>(
  '/genreslider/movie',
  async (req, res, next) => {
    const tmdb = new TheMovieDb();

    try {
      const mappedGenres: GenreSliderItem[] = [];

      const genres = await tmdb.getMovieGenres({
        language: (req.query.language as string) ?? req.locale,
      });

      await Promise.all(
        genres.map(async (genre) => {
          const genreData = await tmdb.getDiscoverMovies({
            genre: genre.id.toString(),
          });

          mappedGenres.push({
            id: genre.id,
            name: genre.name,
            backdrops: genreData.results
              .filter((title) => !!title.backdrop_path)
              .map((title) => title.backdrop_path) as string[],
          });
        })
      );

      const sortedData = sortBy(mappedGenres, 'name');

      return res.status(200).json(sortedData);
    } catch (e) {
      logger.debug('Something went wrong retrieving the movie genre slider', {
        label: 'API',
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve movie genre slider.',
      });
    }
  }
);

discoverRoutes.get<{ language: string }, GenreSliderItem[]>(
  '/genreslider/tv',
  async (req, res, next) => {
    const tmdb = new TheMovieDb();

    try {
      const mappedGenres: GenreSliderItem[] = [];

      const genres = await tmdb.getTvGenres({
        language: (req.query.language as string) ?? req.locale,
      });

      await Promise.all(
        genres.map(async (genre) => {
          const genreData = await tmdb.getDiscoverTv({
            genre: genre.id.toString(),
          });

          mappedGenres.push({
            id: genre.id,
            name: genre.name,
            backdrops: genreData.results
              .filter((title) => !!title.backdrop_path)
              .map((title) => title.backdrop_path) as string[],
          });
        })
      );

      const sortedData = sortBy(mappedGenres, 'name');

      return res.status(200).json(sortedData);
    } catch (e) {
      logger.debug('Something went wrong retrieving the series genre slider', {
        label: 'API',
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve series genre slider.',
      });
    }
  }
);

discoverRoutes.get('/music', async (req, res) => {
  try {
    const settings = getSettings();

    // Check if lidarr settings exist
    if (!settings.lidarr || settings.lidarr.length === 0) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    // Get the default Lidarr instance
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

    logger.info('Connecting to Lidarr API', {
      label: 'API',
      url: apiUrl,
      endpoint: `${apiUrl}/artist`,
    });

    const lidarrApi = new LidarrAPI({
      url: apiUrl,
      apiKey: lidarrSettings.apiKey,
    });

    // Get all artists from Lidarr (this will be popular artists already in the library)
    let artists = [];
    try {
      artists = await lidarrApi.getArtists();
      logger.info(`Fetched ${artists.length} artists from Lidarr`, {
        label: 'API',
        totalCount: artists.length,
      });

      // Log first artist's image data to debug missing images
      if (artists[0]) {
        logger.info('First artist image data:', {
          label: 'API',
          artistName: artists[0].artistName,
          imageTypes: artists[0].images?.map((img) => img.coverType),
          hasImages: !!artists[0].images && artists[0].images.length > 0,
        });
      }
    } catch (apiError) {
      logger.warn('Failed to fetch artists from Lidarr', {
        label: 'API',
        errorMessage: apiError.message,
      });
      // Return empty results if Lidarr connection fails
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    // Sort artists based on query parameter
    const sortBy = (req.query.sortBy as string) || 'albumCount';
    const sortedArtists = [...artists];

    switch (sortBy) {
      case 'name':
        // Sort alphabetically by artist name
        sortedArtists.sort((a, b) => {
          const nameA = a.artistName || '';
          const nameB = b.artistName || '';
          return nameA.localeCompare(nameB);
        });
        break;
      case 'dateAdded':
        // Sort by date added (most recent first)
        sortedArtists.sort((a, b) => {
          const dateA = a.added ? new Date(a.added).getTime() : 0;
          const dateB = b.added ? new Date(b.added).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'albumCount':
      default:
        // Sort by album count (popularity proxy)
        sortedArtists.sort(
          (a, b) =>
            (b.statistics?.albumCount || 0) - (a.statistics?.albumCount || 0)
        );
        break;
    }

    const page = Number(req.query.page) || 1;
    const itemsPerPage = 20;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedArtists = sortedArtists.slice(startIndex, endIndex);

    // Get media info for artists
    const media = await Media.getRelatedMedia(
      paginatedArtists.map((artist) => artist.id)
    );

    const mappedResults = paginatedArtists.map((artist) =>
      mapArtistResult(
        artist,
        media.find(
          (m) => m.tmdbId === artist.id && m.mediaType === MediaType.MUSIC
        ),
        apiUrl
      )
    );

    // Log first mapped result to see what's being returned
    if (mappedResults[0]) {
      logger.info('First mapped result:', {
        label: 'API',
        mappedResult: JSON.stringify(mappedResults[0]),
      });
    }

    return res.status(200).json({
      page,
      totalPages: Math.ceil(sortedArtists.length / itemsPerPage),
      totalResults: sortedArtists.length,
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Something went wrong retrieving music', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    // Return empty results instead of 500 error
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

// Music discover endpoints for different sections
discoverRoutes.get('/music/popular-artists', async (req, res) => {
  try {
    const settings = getSettings();
    const lidarrSettings = settings.lidarr?.find((lidarr) => lidarr.isDefault);

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

    const artists = await lidarrApi.getArtists();

    // Sort by album count (most popular)
    const sortedArtists = artists.sort(
      (a, b) =>
        (b.statistics?.albumCount || 0) - (a.statistics?.albumCount || 0)
    );

    const page = Number(req.query.page) || 1;
    const itemsPerPage = 20;
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedArtists = sortedArtists.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    const media = await Media.getRelatedMedia(
      paginatedArtists.map((artist) => artist.id)
    );

    const mappedResults = paginatedArtists.map((artist) =>
      mapArtistResult(
        artist,
        media.find(
          (m) => m.tmdbId === artist.id && m.mediaType === MediaType.MUSIC
        ),
        apiUrl
      )
    );

    return res.status(200).json({
      page,
      totalPages: Math.ceil(sortedArtists.length / itemsPerPage),
      totalResults: sortedArtists.length,
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving popular artists', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get('/music/recent-albums', async (req, res) => {
  try {
    const settings = getSettings();
    const lidarrSettings = settings.lidarr?.find((lidarr) => lidarr.isDefault);

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

    const artists = await lidarrApi.getArtists();
    const allAlbums = [];

    // Get albums from all artists and sort by added date
    for (const artist of artists) {
      try {
        const albums = await lidarrApi.getAlbumsByArtist(artist.id);
        allAlbums.push(...albums.map((album) => ({ ...album, artist })));
      } catch (e) {
        logger.warn(`Failed to fetch albums for artist ${artist.id}`, {
          label: 'API',
          error: e.message,
        });
      }
    }

    // Sort by monitored status and album ID (proxy for recently added)
    const sortedAlbums = allAlbums.sort((a, b) => {
      // Monitored albums first, then by descending ID (newer albums have higher IDs)
      if (a.monitored !== b.monitored) {
        return a.monitored ? -1 : 1;
      }
      return b.id - a.id;
    });

    const page = Number(req.query.page) || 1;
    const itemsPerPage = 20;
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedAlbums = sortedAlbums.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    const { mapAlbumResult } = await import('@server/models/Music');
    const media = await Media.getRelatedMedia(
      paginatedAlbums.map((album) => album.id)
    );

    const mappedResults = paginatedAlbums.map((album) =>
      mapAlbumResult(
        album,
        media.find(
          (m) => m.tmdbId === album.id && m.mediaType === MediaType.MUSIC
        ),
        apiUrl
      )
    );

    return res.status(200).json({
      page,
      totalPages: Math.ceil(sortedAlbums.length / itemsPerPage),
      totalResults: sortedAlbums.length,
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving recent albums', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get('/music/top-albums', async (req, res) => {
  try {
    const settings = getSettings();
    const lidarrSettings = settings.lidarr?.find((lidarr) => lidarr.isDefault);

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

    const artists = await lidarrApi.getArtists();
    const allAlbums = [];

    // Get all albums from all artists
    for (const artist of artists) {
      try {
        const albums = await lidarrApi.getAlbumsByArtist(artist.id);
        allAlbums.push(...albums.map((album) => ({ ...album, artist })));
      } catch (e) {
        logger.warn(`Failed to fetch albums for artist ${artist.id}`, {
          label: 'API',
          error: e.message,
        });
      }
    }

    // Sort by ratings/popularity (using monitored status and track count as proxy)
    const sortedAlbums = allAlbums.sort((a, b) => {
      // Prefer monitored albums and those with more tracks
      const aTrackCount = a.releases?.[0]?.trackCount || 0;
      const bTrackCount = b.releases?.[0]?.trackCount || 0;
      const scoreA = (a.monitored ? 1000 : 0) + aTrackCount;
      const scoreB = (b.monitored ? 1000 : 0) + bTrackCount;
      return scoreB - scoreA;
    });

    const page = Number(req.query.page) || 1;
    const itemsPerPage = 50; // Top 50 albums
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedAlbums = sortedAlbums.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    const { mapAlbumResult } = await import('@server/models/Music');
    const media = await Media.getRelatedMedia(
      paginatedAlbums.map((album) => album.id)
    );

    const mappedResults = paginatedAlbums.map((album) =>
      mapAlbumResult(
        album,
        media.find(
          (m) => m.tmdbId === album.id && m.mediaType === MediaType.MUSIC
        ),
        apiUrl
      )
    );

    return res.status(200).json({
      page,
      totalPages: Math.ceil(sortedAlbums.length / itemsPerPage),
      totalResults: sortedAlbums.length,
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving top albums', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get<Record<string, unknown>, WatchlistResponse>(
  '/watchlist',
  async (req, res) => {
    const userRepository = getRepository(User);
    const itemsPerPage = 20;
    const page = Number(req.query.page) ?? 1;
    const offset = (page - 1) * itemsPerPage;

    const activeUser = await userRepository.findOne({
      where: { id: req.user?.id },
      select: ['id', 'plexToken'],
    });

    if (!activeUser?.plexToken) {
      // We will just return an empty array if the user has no Plex token
      return res.json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    const plexTV = new PlexTvAPI(activeUser.plexToken);

    const watchlist = await plexTV.getWatchlist({ offset });

    return res.json({
      page,
      totalPages: Math.ceil(watchlist.totalSize / itemsPerPage),
      totalResults: watchlist.totalSize,
      results: watchlist.items.map((item) => ({
        ratingKey: item.ratingKey,
        title: item.title,
        mediaType: item.type === 'show' ? 'tv' : 'movie',
        tmdbId: item.tmdbId,
      })),
    });
  }
);

// Last.fm Global Chart Routes
discoverRoutes.get('/music/lastfm/top-artists', async (req, res) => {
  try {
    const settings = getSettings();

    if (!settings.lastfm.apiKey) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    const lastfm = new LastfmAPI(settings.lastfm.apiKey);
    const page = Number(req.query.page) || 1;
    const limit = 50;

    const data = await lastfm.getChartTopArtists({ page, limit });

    // Fetch individual artist info for the first 20 to get real images
    const artistsToEnhance = data.artists.artist.slice(0, 20);
    const enhancedArtistsPromises = artistsToEnhance.map(async (artist) => {
      try {
        const artistInfo = await lastfm.getArtistInfo(
          artist.name,
          artist.mbid || undefined
        );
        // Return artist with enhanced image
        return {
          ...artist,
          image: artistInfo.artist.image || artist.image,
        };
      } catch (e) {
        logger.debug('Could not fetch enhanced artist info', {
          label: 'API',
          artistName: artist.name,
        });
        // Return original artist if fetch fails
        return artist;
      }
    });

    const enhancedArtists = await Promise.all(enhancedArtistsPromises);

    // Map enhanced artists first, then remaining artists with placeholder images
    const remainingArtists = data.artists.artist.slice(20);
    const allArtists = [...enhancedArtists, ...remainingArtists];

    const mappedResults = allArtists.map((artist) =>
      mapLastfmArtistResult(artist)
    );

    return res.status(200).json({
      page: parseInt(data.artists['@attr'].page, 10),
      totalPages: parseInt(data.artists['@attr'].totalPages, 10),
      totalResults: parseInt(data.artists['@attr'].total, 10),
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving Last.fm top artists', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get('/music/lastfm/top-albums', async (req, res) => {
  try {
    const settings = getSettings();

    if (!settings.lastfm.apiKey) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    const lastfm = new LastfmAPI(settings.lastfm.apiKey);
    const page = Number(req.query.page) || 1;
    const limit = 50;

    const data = await lastfm.getTopAlbums({ page, limit });

    // Fetch individual artist info for the first 20 albums to get real artist images
    const albumsToEnhance = data.albums.album.slice(0, 20);
    const enhancedAlbumsPromises = albumsToEnhance.map(async (album) => {
      try {
        const artistInfo = await lastfm.getArtistInfo(
          album.artist.name,
          album.artist.mbid || undefined
        );
        // Return album with enhanced artist image merged into album image
        // (Last.fm often uses artist image for album covers in charts)
        return {
          ...album,
          image: album.image?.[0]?.['#text']
            ? album.image
            : artistInfo.artist.image || album.image,
        };
      } catch (e) {
        logger.debug('Could not fetch enhanced album/artist info', {
          label: 'API',
          albumName: album.name,
        });
        // Return original album if fetch fails
        return album;
      }
    });

    const enhancedAlbums = await Promise.all(enhancedAlbumsPromises);

    // Map enhanced albums first, then remaining albums with placeholder images
    const remainingAlbums = data.albums.album.slice(20);
    const allAlbums = [...enhancedAlbums, ...remainingAlbums];

    const mappedResults = allAlbums.map((album) => mapLastfmAlbumResult(album));

    return res.status(200).json({
      page: parseInt(data.albums['@attr'].page, 10),
      totalPages: parseInt(data.albums['@attr'].totalPages, 10),
      totalResults: parseInt(data.albums['@attr'].total, 10),
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving Last.fm top albums', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get('/music/lastfm/top-tracks', async (req, res) => {
  try {
    const settings = getSettings();

    if (!settings.lastfm.apiKey) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    const lastfm = new LastfmAPI(settings.lastfm.apiKey);
    const page = Number(req.query.page) || 1;
    const limit = 50;

    const data = await lastfm.getChartTopTracks({ page, limit });

    const mappedResults = data.tracks.track.map((track) =>
      mapLastfmTrackResult(track)
    );

    return res.status(200).json({
      page: parseInt(data.tracks['@attr'].page, 10),
      totalPages: parseInt(data.tracks['@attr'].totalPages, 10),
      totalResults: parseInt(data.tracks['@attr'].total, 10),
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving Last.fm top tracks', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get('/music/lastfm/trending-artists', async (req, res) => {
  try {
    const settings = getSettings();

    if (!settings.lastfm.apiKey) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    const lastfm = new LastfmAPI(settings.lastfm.apiKey);
    const page = Number(req.query.page) || 1;
    const limit = 50;

    // Use top artists as trending (Last.fm doesn't have a specific trending endpoint)
    const data = await lastfm.getChartTopArtists({ page, limit });

    const mappedResults = data.artists.artist.map((artist) =>
      mapLastfmArtistResult(artist)
    );

    return res.status(200).json({
      page: parseInt(data.artists['@attr'].page, 10),
      totalPages: parseInt(data.artists['@attr'].totalPages, 10),
      totalResults: parseInt(data.artists['@attr'].total, 10),
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving Last.fm trending artists', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get('/music/lastfm/new-releases', async (req, res) => {
  try {
    const settings = getSettings();

    if (!settings.lastfm.apiKey) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

    const lastfm = new LastfmAPI(settings.lastfm.apiKey);
    const page = Number(req.query.page) || 1;
    const limit = 50;

    const data = await lastfm.getNewReleases({ page, limit });

    // Fetch individual artist info for the first 20 albums to get better images
    const albumsToEnhance = data.albums.album.slice(0, 20);
    const enhancedAlbumsPromises = albumsToEnhance.map(async (album) => {
      try {
        const artistInfo = await lastfm.getArtistInfo(
          album.artist.name,
          album.artist.mbid || undefined
        );
        return {
          ...album,
          image: album.image?.[0]?.['#text']
            ? album.image
            : artistInfo.artist.image || album.image,
        };
      } catch (e) {
        logger.debug('Could not fetch enhanced album/artist info', {
          label: 'API',
          albumName: album.name,
        });
        return album;
      }
    });

    const enhancedAlbums = await Promise.all(enhancedAlbumsPromises);
    const remainingAlbums = data.albums.album.slice(20);
    const allAlbums = [...enhancedAlbums, ...remainingAlbums];

    const mappedResults = allAlbums.map((album) => mapLastfmAlbumResult(album));

    return res.status(200).json({
      page: parseInt(data.albums['@attr'].page, 10),
      totalPages: parseInt(data.albums['@attr'].totalPages, 10),
      totalResults: parseInt(data.albums['@attr'].total, 10),
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving Last.fm new releases', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

discoverRoutes.get('/music/artists-you-follow/albums', async (req, res) => {
  try {
    const settings = getSettings();

    if (!settings.lidarr || settings.lidarr.length === 0) {
      return res.status(200).json({
        page: 1,
        totalPages: 1,
        totalResults: 0,
        results: [],
      });
    }

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
    logger.info('Fetching albums from artists you follow', { label: 'API' });

    const lidarr = new LidarrAPI({
      apiKey: lidarrSettings.apiKey,
      url: apiUrl,
    });

    // Get all artists from Lidarr
    const artists = await lidarr.getArtists();

    // Get all albums from all artists
    const allAlbumsPromises = artists.map(async (artist) => {
      try {
        const albums = await lidarr.getAlbumsByArtist(artist.id);
        return albums;
      } catch (e) {
        logger.debug('Could not fetch albums for artist', {
          label: 'API',
          artistName: artist.artistName,
        });
        return [];
      }
    });

    const allAlbums = (await Promise.all(allAlbumsPromises)).flat();

    // Sort by album ID (newest first - higher ID typically means more recent)
    const sortedAlbums = allAlbums.sort((a, b) => b.id - a.id);

    // Pagination
    const page = Number(req.query.page) || 1;
    const limit = 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAlbums = sortedAlbums.slice(startIndex, endIndex);

    // Map to AlbumResult format
    const mappedResults = paginatedAlbums.map((album) => mapAlbumResult(album));

    return res.status(200).json({
      page,
      totalPages: Math.ceil(sortedAlbums.length / limit),
      totalResults: sortedAlbums.length,
      results: mappedResults,
    });
  } catch (e) {
    logger.error('Error retrieving albums from artists you follow', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return res.status(200).json({
      page: 1,
      totalPages: 1,
      totalResults: 0,
      results: [],
    });
  }
});

export default discoverRoutes;
