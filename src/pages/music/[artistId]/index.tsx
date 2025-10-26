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
  const response = await axios.get<ArtistResult>(
    `http://${process.env.HOST || 'localhost'}:${
      process.env.PORT || 5055
    }/api/v1/music/${ctx.query.artistId}`,
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
