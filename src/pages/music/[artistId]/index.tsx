import ArtistDetails from '@app/components/ArtistDetails';
import type { ArtistResult } from '@server/models/Music';
import axios from 'axios';
import type { GetServerSideProps, NextPage } from 'next';

interface ArtistPageProps {
  artist?: ArtistResult;
}

const ArtistPage: NextPage<ArtistPageProps> = ({ artist }) => {
  return <ArtistDetails artist={artist} />;
};

export const getServerSideProps: GetServerSideProps<ArtistPageProps> = async (
  ctx
) => {
  try {
    const artistId = ctx.query.artistId as string;

    // Determine the endpoint based on the artistId format:
    // 1. UUID (MBID) → use mbid endpoint
    // 2. Starts with letter → artist name for search endpoint
    // 3. Numeric → Lidarr artist ID
    const isMBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artistId);
    const isNumeric = /^\d+$/.test(artistId);

    let endpoint: string;
    if (isMBID) {
      endpoint = `/api/v1/music/mbid/${artistId}`;
    } else if (!isNumeric) {
      // Artist name - use search endpoint
      endpoint = `/api/v1/music/search/${encodeURIComponent(artistId)}`;
    } else {
      // Numeric ID - Lidarr endpoint
      endpoint = `/api/v1/music/${artistId}`;
    }

    const response = await axios.get<ArtistResult>(
      `http://${process.env.HOST || 'localhost'}:${
        process.env.PORT || 5055
      }${endpoint}`,
      {
        headers: ctx.req?.headers?.cookie
          ? { cookie: ctx.req.headers.cookie }
          : undefined,
      }
    );

    return {
      props: {
        artist: response.data,
      },
    };
  } catch (e) {
    console.error('Error fetching artist:', e);
    return {
      notFound: true,
    };
  }
};

export default ArtistPage;
