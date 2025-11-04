// MusicBrainz API Response Interfaces

export interface MusicBrainzArtist {
  id: string; // MBID
  name: string;
  'sort-name': string;
  type?: string;
  'type-id'?: string;
  disambiguation?: string;
  country?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  area?: {
    id: string;
    name: string;
    'sort-name': string;
  };
  'begin-area'?: {
    id: string;
    name: string;
    'sort-name': string;
  };
  tags?: Array<{
    count: number;
    name: string;
  }>;
  rating?: {
    value: number;
    'votes-count': number;
  };
  aliases?: Array<{
    name: string;
    'sort-name': string;
    locale?: string;
    type?: string;
    primary?: boolean;
    'begin-date'?: string;
    'end-date'?: string;
  }>;
  'release-groups'?: MusicBrainzReleaseGroup[];
}

export interface MusicBrainzReleaseGroup {
  id: string; // MBID
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string;
  'primary-type-id'?: string;
  'secondary-types'?: string[];
  'secondary-type-ids'?: string[];
  disambiguation?: string;
  'artist-credit'?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
      'sort-name': string;
    };
  }>;
  tags?: Array<{
    count: number;
    name: string;
  }>;
}

export interface MusicBrainzArtistResponse {
  artist: MusicBrainzArtist;
}

export interface MusicBrainzReleaseGroupsResponse {
  'release-groups': MusicBrainzReleaseGroup[];
  'release-group-count': number;
  'release-group-offset': number;
}
