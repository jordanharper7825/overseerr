import LidarrAPI from '@server/api/servarr/lidarr';
import type { LidarrArtist } from '@server/api/servarr/lidarr';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import type { LidarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { uniqWith } from 'lodash';
import BaseScanner from '../baseScanner';

type SyncStatus = 'success' | 'error';

class LidarrScanner extends BaseScanner<LidarrArtist> {
  private servers: LidarrSettings[];
  private currentServer: LidarrSettings | null = null;
  private lidarrApi: LidarrAPI;

  public constructor() {
    super('Lidarr Scan', { bundleSize: 50 });
  }

  public async run(): Promise<void> {
    const settings = getSettings();
    const sessionId = this.startSession();

    try {
      this.servers = uniqWith(
        settings.lidarr,
        (lidarrA, lidarrB) =>
          lidarrA.hostname === lidarrB.hostname &&
          lidarrA.port === lidarrB.port &&
          lidarrA.baseUrl === lidarrB.baseUrl
      );

      for (const server of this.servers) {
        if (server.syncEnabled) {
          logger.info(`Beginning to process Lidarr server: ${server.name}`, {
            label: 'Lidarr Scanner',
            server: server.name,
          });

          this.currentServer = server;
          this.lidarrApi = new LidarrAPI({
            apiKey: server.apiKey,
            url: LidarrAPI.buildUrl(server, '/api/v1'),
          });

          try {
            this.items = await this.lidarrApi.getArtists();

            await this.loop(this.processLidarrArtist.bind(this), { sessionId });
          } catch (e) {
            logger.error('Failed to retrieve artists from Lidarr', {
              label: 'Lidarr Scanner',
              server: server.name,
              errorMessage: e.message,
            });
          }
        } else {
          logger.info(`Sync not enabled for Lidarr server: ${server.name}`, {
            label: 'Lidarr Scanner',
            server: server.name,
          });
        }
      }

      logger.info('Lidarr scan complete', { label: 'Lidarr Scanner' });
    } catch (e) {
      logger.error('Failed to run Lidarr scan', {
        label: 'Lidarr Scanner',
        errorMessage: e.message,
      });
    } finally {
      this.endSession(sessionId);
    }
  }

  private async processLidarrArtist(
    lidarrArtist: LidarrArtist
  ): Promise<SyncStatus> {
    try {
      const mediaRepository = getRepository(Media);
      const server = this.currentServer as LidarrSettings;

      // Find media by MusicBrainz ID
      const media = await mediaRepository.findOne({
        where: {
          musicbrainzId: lidarrArtist.foreignArtistId,
          mediaType: MediaType.MUSIC,
        },
      });

      if (!media) {
        logger.debug('Media not found for Lidarr artist, skipping', {
          label: 'Lidarr Scanner',
          artistName: lidarrArtist.artistName,
          mbid: lidarrArtist.foreignArtistId,
        });
        return 'success';
      }

      // Calculate status based on statistics
      const hasAllTracks =
        lidarrArtist.statistics &&
        lidarrArtist.statistics.trackFileCount > 0 &&
        lidarrArtist.statistics.trackFileCount ===
          lidarrArtist.statistics.totalTrackCount;

      const hasSomeTracks =
        lidarrArtist.statistics && lidarrArtist.statistics.trackFileCount > 0;

      let newStatus: MediaStatus;
      if (hasAllTracks) {
        newStatus = MediaStatus.AVAILABLE;
      } else if (hasSomeTracks) {
        newStatus = MediaStatus.PARTIALLY_AVAILABLE;
      } else if (lidarrArtist.monitored) {
        newStatus = MediaStatus.PROCESSING;
      } else {
        newStatus = MediaStatus.UNKNOWN;
      }

      // Update media if status changed
      if (media.status !== newStatus) {
        media.status = newStatus;
      }

      media.externalServiceId = lidarrArtist.id;
      media.externalServiceSlug = lidarrArtist.foreignArtistId;
      media.serviceId = server.id;

      await mediaRepository.save(media);

      logger.debug('Updated media status from Lidarr artist', {
        label: 'Lidarr Scanner',
        artistName: lidarrArtist.artistName,
        mediaId: media.id,
        status: newStatus,
      });

      return 'success';
    } catch (e) {
      logger.error('Failed to process Lidarr artist', {
        label: 'Lidarr Scanner',
        errorMessage: e.message,
        artist: lidarrArtist.artistName,
      });
      return 'error';
    }
  }
}

const lidarrScanner = new LidarrScanner();

export { lidarrScanner };
export default lidarrScanner;
