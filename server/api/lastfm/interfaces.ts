// Last.fm API Response Interfaces

export interface LastfmImage {
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | '';
  '#text': string;
}

export interface LastfmArtist {
  name: string;
  playcount?: string;
  listeners?: string;
  mbid?: string;
  url: string;
  streamable?: string;
  image?: LastfmImage[];
}

export interface LastfmAlbum {
  name: string;
  playcount?: string;
  mbid?: string;
  url: string;
  artist: {
    name: string;
    mbid?: string;
    url: string;
  };
  image?: LastfmImage[];
}

export interface LastfmTrack {
  name: string;
  duration?: string;
  playcount?: string;
  listeners?: string;
  mbid?: string;
  url: string;
  streamable?: {
    '#text': string;
    fulltrack: string;
  };
  artist: {
    name: string;
    mbid?: string;
    url: string;
  };
  image?: LastfmImage[];
}

export interface LastfmTopArtistsResponse {
  artists: {
    artist: LastfmArtist[];
    '@attr': {
      page: string;
      total: string;
      user?: string;
      perPage: string;
      totalPages: string;
    };
  };
}

export interface LastfmTopAlbumsResponse {
  albums: {
    album: LastfmAlbum[];
    '@attr': {
      page: string;
      total: string;
      user?: string;
      perPage: string;
      totalPages: string;
    };
  };
}

export interface LastfmTopTracksResponse {
  tracks: {
    track: LastfmTrack[];
    '@attr': {
      page: string;
      total: string;
      user?: string;
      perPage: string;
      totalPages: string;
    };
  };
}

export interface LastfmChartTopArtistsResponse {
  artists: {
    artist: LastfmArtist[];
    '@attr': {
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

export interface LastfmChartTopTracksResponse {
  tracks: {
    track: LastfmTrack[];
    '@attr': {
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

export interface LastfmChartTopTagsResponse {
  tags: {
    tag: Array<{
      name: string;
      url: string;
      reach: string;
      taggings: string;
      streamable: string;
      wiki?: {
        summary: string;
        content: string;
      };
    }>;
    '@attr': {
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

export interface LastfmArtistInfo {
  artist: {
    name: string;
    mbid?: string;
    url: string;
    image?: LastfmImage[];
    streamable?: string;
    ontour?: string;
    stats: {
      listeners: string;
      playcount: string;
    };
    similar?: {
      artist: Array<{
        name: string;
        url: string;
        image?: LastfmImage[];
      }>;
    };
    tags?: {
      tag: Array<{
        name: string;
        url: string;
      }>;
    };
    bio?: {
      links?: {
        link: {
          '#text': string;
          rel: string;
          href: string;
        };
      };
      published?: string;
      summary: string;
      content: string;
    };
  };
}
