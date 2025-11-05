import ExternalAPI from '@server/api/externalapi';
import cacheManager from '@server/lib/cache';
import type {
  LastfmArtistInfo,
  LastfmChartTopArtistsResponse,
  LastfmChartTopTracksResponse,
  LastfmTopAlbumsResponse,
  LastfmTopArtistsResponse,
  LastfmTopTracksResponse,
} from './interfaces';

interface GetTopArtistsOptions {
  page?: number;
  limit?: number;
}

interface GetTopAlbumsOptions {
  page?: number;
  limit?: number;
}

interface GetTopTracksOptions {
  page?: number;
  limit?: number;
}

class LastfmAPI extends ExternalAPI {
  constructor(apiKey: string) {
    super(
      'https://ws.audioscrobbler.com/2.0/',
      {
        api_key: apiKey,
        format: 'json',
      },
      {
        nodeCache: cacheManager.getCache('lastfm').data,
        rateLimit: {
          maxRequests: 5,
          maxRPS: 1,
        },
      }
    );
  }

  /**
   * Get global top artists chart
   */
  public async getChartTopArtists(
    options: GetTopArtistsOptions = {}
  ): Promise<LastfmChartTopArtistsResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmChartTopArtistsResponse>(
      '/',
      {
        params: {
          method: 'chart.gettopartists',
          page,
          limit,
        },
      },
      3600 // Cache for 1 hour
    );
  }

  /**
   * Get global top tracks chart
   */
  public async getChartTopTracks(
    options: GetTopTracksOptions = {}
  ): Promise<LastfmChartTopTracksResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmChartTopTracksResponse>(
      '/',
      {
        params: {
          method: 'chart.gettoptracks',
          page,
          limit,
        },
      },
      3600 // Cache for 1 hour
    );
  }

  /**
   * Get top albums globally (using 'pop' tag for current popular albums)
   */
  public async getTopAlbums(
    options: GetTopAlbumsOptions = {}
  ): Promise<LastfmTopAlbumsResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmTopAlbumsResponse>(
      '/',
      {
        params: {
          method: 'tag.gettopalbums',
          tag: 'pop',
          page,
          limit,
        },
      },
      3600 // Cache for 1 hour
    );
  }

  /**
   * Get top artists by tag
   */
  public async getTopArtistsByTag(
    tag: string,
    options: GetTopArtistsOptions = {}
  ): Promise<LastfmTopArtistsResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmTopArtistsResponse>(
      '/',
      {
        params: {
          method: 'tag.gettopartists',
          tag,
          page,
          limit,
        },
      },
      3600
    );
  }

  /**
   * Get top tracks by tag
   */
  public async getTopTracksByTag(
    tag: string,
    options: GetTopTracksOptions = {}
  ): Promise<LastfmTopTracksResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmTopTracksResponse>(
      '/',
      {
        params: {
          method: 'tag.gettoptracks',
          tag,
          page,
          limit,
        },
      },
      3600
    );
  }

  /**
   * Get artist info by name
   */
  public async getArtistInfo(
    artistName: string,
    mbid?: string
  ): Promise<LastfmArtistInfo> {
    return this.get<LastfmArtistInfo>(
      '/',
      {
        params: {
          method: 'artist.getinfo',
          artist: artistName,
          ...(mbid && { mbid }),
          autocorrect: 1,
        },
      },
      86400 // Cache for 24 hours
    );
  }

  /**
   * Get new releases (using '2024' tag for recent albums)
   */
  public async getNewReleases(
    options: GetTopAlbumsOptions = {}
  ): Promise<LastfmTopAlbumsResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmTopAlbumsResponse>(
      '/',
      {
        params: {
          method: 'tag.gettopalbums',
          tag: '2024',
          page,
          limit,
        },
      },
      3600 // Cache for 1 hour
    );
  }

  /**
   * Get top artists by country
   */
  public async getTopArtistsByCountry(
    country: string,
    options: GetTopArtistsOptions = {}
  ): Promise<LastfmChartTopArtistsResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmChartTopArtistsResponse>(
      '/',
      {
        params: {
          method: 'geo.gettopartists',
          country,
          page,
          limit,
        },
      },
      3600 // Cache for 1 hour
    );
  }

  /**
   * Get top tracks by country
   */
  public async getTopTracksByCountry(
    country: string,
    options: GetTopTracksOptions = {}
  ): Promise<LastfmChartTopTracksResponse> {
    const { page = 1, limit = 50 } = options;

    return this.get<LastfmChartTopTracksResponse>(
      '/',
      {
        params: {
          method: 'geo.gettoptracks',
          country,
          page,
          limit,
        },
      },
      3600 // Cache for 1 hour
    );
  }
}

export default LastfmAPI;
