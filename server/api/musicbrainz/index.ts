import ExternalAPI from '@server/api/externalapi';
import cacheManager from '@server/lib/cache';
import type {
  MusicBrainzArtistResponse,
  MusicBrainzArtistSearchResponse,
  MusicBrainzReleaseGroupsResponse,
} from './interfaces';

class MusicBrainzAPI extends ExternalAPI {
  constructor() {
    super(
      'https://musicbrainz.org/ws/2',
      {
        fmt: 'json',
      },
      {
        headers: {
          'User-Agent': 'Overseerr/1.0.0 ( https://overseerr.dev )',
        },
        nodeCache: cacheManager.getCache('musicbrainz').data,
        rateLimit: {
          maxRequests: 1,
          maxRPS: 1, // MusicBrainz rate limit: 1 request per second
        },
      }
    );
  }

  /**
   * Get artist details by MBID
   */
  public async getArtist(mbid: string): Promise<MusicBrainzArtistResponse> {
    return this.get<MusicBrainzArtistResponse>(
      `/artist/${mbid}`,
      {
        params: {
          inc: 'aliases+tags+ratings+genres',
        },
      },
      86400 // Cache for 24 hours
    );
  }

  /**
   * Get artist's release groups (albums, singles, etc.)
   */
  public async getArtistReleaseGroups(
    mbid: string,
    options: {
      type?: string[]; // 'album', 'single', 'ep', 'compilation', 'live', etc.
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MusicBrainzReleaseGroupsResponse> {
    const { type, limit = 50, offset = 0 } = options;

    return this.get<MusicBrainzReleaseGroupsResponse>(
      '/release-group',
      {
        params: {
          artist: mbid,
          ...(type && { type: type.join('|') }),
          limit,
          offset,
        },
      },
      3600 // Cache for 1 hour
    );
  }

  /**
   * Search for artists by name
   */
  public async searchArtists(
    query: string,
    limit = 5
  ): Promise<MusicBrainzArtistSearchResponse> {
    return this.get<MusicBrainzArtistSearchResponse>(
      '/artist',
      {
        params: {
          query,
          limit,
        },
      },
      3600 // Cache for 1 hour
    );
  }
}

export default MusicBrainzAPI;
