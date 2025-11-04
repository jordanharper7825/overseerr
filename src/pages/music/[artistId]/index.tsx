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
  const artistId = ctx.query.artistId as string;

  // Check if artistId is a UUID (MBID) or numeric ID
  const isMBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artistId);

  const endpoint = isMBID
    ? `/api/v1/music/mbid/${artistId}`
    : `/api/v1/music/${artistId}`;

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
};

export default ArtistPage;
