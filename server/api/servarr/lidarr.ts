import logger from '@server/logger';
import ServarrBase from './base';

export interface LidarrMetadataProfile {
  id: number;
  name: string;
}

export interface LidarrArtist {
  id: number;
  artistName: string;
  foreignArtistId: string;
  monitored: boolean;
  qualityProfileId: number;
  metadataProfileId: number;
  artistType: string;
  disambiguation: string;
  overview: string;
  images: {
    url: string;
    coverType: string;
    extension: string;
  }[];
  path: string;
  rootFolderPath: string;
  tags: number[];
  added: string;
  statistics: {
    albumCount: number;
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
}

export interface LidarrAlbum {
  id: number;
  title: string;
  disambiguation: string;
  overview: string;
  artistId: number;
  foreignAlbumId: string;
  monitored: boolean;
  anyReleaseOk: boolean;
  profileId: number;
  duration: number;
  albumType: string;
  images: {
    url: string;
    coverType: string;
    extension: string;
  }[];
  releases: {
    id: number;
    albumId: number;
    foreignReleaseId: string;
    title: string;
    status: string;
    duration: number;
    trackCount: number;
    media: {
      mediumNumber: number;
      mediumName: string;
      mediumFormat: string;
    }[];
    monitored: boolean;
  }[];
  artist: LidarrArtist;
}

export interface AddArtistOptions {
  artistName: string;
  foreignArtistId: string;
  qualityProfileId: number;
  metadataProfileId: number;
  rootFolderPath: string;
  monitored: boolean;
  searchForMissingAlbums?: boolean;
  tags?: number[];
  addAlbumIds?: number[];
}

export interface AddAlbumOptions {
  title: string;
  foreignAlbumId: string;
  artistId: number;
  qualityProfileId: number;
  monitored: boolean;
  tags?: number[];
  searchForNewAlbum?: boolean;
}

class LidarrAPI extends ServarrBase<{ artistId?: number; albumId?: number }> {
  constructor({ url, apiKey }: { url: string; apiKey: string }) {
    super({ url, apiKey, cacheName: 'lidarr', apiName: 'Lidarr' });
  }

  public getArtists = async (): Promise<LidarrArtist[]> => {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist');

      // Check if we got HTML instead of JSON (common API misconfiguration)
      if (typeof response.data === 'string') {
        const dataStr = response.data as string;
        throw new Error(
          `[Lidarr] API returned HTML instead of JSON. This usually means the base URL is incorrect. Response: ${dataStr.substring(0, 200)}`
        );
      }

      if (!Array.isArray(response.data)) {
        throw new Error(
          `[Lidarr] API returned unexpected data type: ${typeof response.data}`
        );
      }

      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artists: ${e.message}`);
    }
  };

  public getArtist = async ({ id }: { id: number }): Promise<LidarrArtist> => {
    try {
      const response = await this.axios.get<LidarrArtist>(`/artist/${id}`);
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artist: ${e.message}`);
    }
  };

  public async getArtistByMusicBrainzId(
    mbid: string
  ): Promise<LidarrArtist | null> {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist/lookup', {
        params: {
          term: `mbid:${mbid}`,
        },
      });

      if (!response.data[0]) {
        return null;
      }

      return response.data[0];
    } catch (e) {
      logger.error('Error retrieving artist by MusicBrainz ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        mbid,
      });
      return null;
    }
  }

  public async getAlbumByReleaseGroupId(
    rgid: string
  ): Promise<LidarrAlbum | null> {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album/lookup', {
        params: {
          term: `rgid:${rgid}`,
        },
      });

      if (!response.data[0]) {
        return null;
      }

      return response.data[0];
    } catch (e) {
      logger.error('Error retrieving album by release group ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        rgid,
      });
      return null;
    }
  }

  public async getAlbumsByArtist(artistId: number): Promise<LidarrAlbum[]> {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album', {
        params: {
          artistId,
        },
      });
      return response.data;
    } catch (e) {
      logger.error('Error retrieving albums by artist ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        artistId,
      });
      return [];
    }
  }

  public searchArtist = async (term: string): Promise<LidarrArtist[]> => {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist/lookup', {
        params: { term },
      });
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to search artists: ${e.message}`);
    }
  };

  public searchAlbum = async (term: string): Promise<LidarrAlbum[]> => {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album/lookup', {
        params: { term },
      });
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to search albums: ${e.message}`);
    }
  };

  public addArtist = async (
    options: AddArtistOptions
  ): Promise<LidarrArtist> => {
    try {
      const artist = await this.getArtistByMusicBrainzId(
        options.foreignArtistId
      );

      if (!artist) {
        throw new Error('Artist not found in Lidarr lookup');
      }

      // Check if artist already exists
      const existingArtists = await this.getArtists();
      const existing = existingArtists.find(
        (a) => a.foreignArtistId === options.foreignArtistId
      );

      if (existing) {
        if (existing.monitored) {
          logger.info(
            'Artist already exists and is monitored. Skipping add and returning success',
            { label: 'Lidarr', artist: existing }
          );
          return existing;
        }

        // Artist exists but is not monitored - update it
        const response = await this.axios.put<LidarrArtist>(`/artist`, {
          ...artist,
          id: existing.id,
          monitored: options.monitored,
          qualityProfileId: options.qualityProfileId,
          metadataProfileId: options.metadataProfileId,
          rootFolderPath: options.rootFolderPath,
          tags: options.tags || [],
        });

        logger.info('Found existing artist in Lidarr and set it to monitored', {
          label: 'Lidarr',
          artistId: response.data.id,
          artistName: response.data.artistName,
        });

        if (options.searchForMissingAlbums) {
          await this.searchArtistAlbums(response.data.id);
        }

        return response.data;
      }

      // Add new artist
      const response = await this.axios.post<LidarrArtist>('/artist', {
        ...artist,
        monitored: options.monitored,
        qualityProfileId: options.qualityProfileId,
        metadataProfileId: options.metadataProfileId,
        rootFolderPath: options.rootFolderPath,
        tags: options.tags || [],
        addOptions: {
          searchForMissingAlbums: options.searchForMissingAlbums ?? false,
          monitor: 'all',
        },
      });

      logger.info('Added artist to Lidarr', {
        label: 'Lidarr',
        artistId: response.data.id,
        artistName: response.data.artistName,
      });

      return response.data;
    } catch (e) {
      logger.error('Failed to add artist to Lidarr', {
        label: 'Lidarr',
        errorMessage: e.message,
        options,
      });
      throw new Error(`[Lidarr] Failed to add artist: ${e.message}`);
    }
  };

  public addAlbum = async (options: AddAlbumOptions): Promise<LidarrAlbum> => {
    try {
      const album = await this.getAlbumByReleaseGroupId(options.foreignAlbumId);

      if (!album) {
        throw new Error('Album not found in Lidarr lookup');
      }

      const response = await this.axios.post<LidarrAlbum>('/album', {
        ...album,
        artistId: options.artistId,
        monitored: options.monitored,
        qualityProfileId: options.qualityProfileId,
        tags: options.tags || [],
        addOptions: {
          searchForNewAlbum: options.searchForNewAlbum ?? false,
        },
      });

      logger.info('Added album to Lidarr', {
        label: 'Lidarr',
        albumId: response.data.id,
        albumTitle: response.data.title,
      });

      return response.data;
    } catch (e) {
      logger.error('Failed to add album to Lidarr', {
        label: 'Lidarr',
        errorMessage: e.message,
        options,
      });
      throw new Error(`[Lidarr] Failed to add album: ${e.message}`);
    }
  };

  public getMetadataProfiles = async (): Promise<LidarrMetadataProfile[]> => {
    try {
      const response = await this.axios.get<LidarrMetadataProfile[]>(
        '/metadataProfile'
      );
      return response.data;
    } catch (e) {
      throw new Error(
        `[Lidarr] Failed to retrieve metadata profiles: ${e.message}`
      );
    }
  };

  public async searchArtistAlbums(artistId: number): Promise<void> {
    try {
      await this.runCommand('ArtistSearch', { artistId });
    } catch (e) {
      logger.error('Failed to search for artist albums', {
        label: 'Lidarr',
        errorMessage: e.message,
        artistId,
      });
    }
  }

  public async triggerAlbumSearch(albumId: number): Promise<void> {
    try {
      await this.runCommand('AlbumSearch', { albumId });
    } catch (e) {
      logger.error('Failed to trigger album search', {
        label: 'Lidarr',
        errorMessage: e.message,
        albumId,
      });
    }
  }
}

export default LidarrAPI;
