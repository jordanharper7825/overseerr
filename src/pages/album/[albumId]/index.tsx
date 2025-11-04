import AlbumDetails from '@app/components/AlbumDetails';
import type { AlbumResult } from '@server/models/Music';
import axios from 'axios';
import type { GetServerSideProps, NextPage } from 'next';

interface AlbumPageProps {
  album?: AlbumResult;
}

const AlbumPage: NextPage<AlbumPageProps> = ({ album }) => {
  return <AlbumDetails album={album} />;
};

export const getServerSideProps: GetServerSideProps<AlbumPageProps> = async (
  ctx
) => {
  try {
    const albumId = ctx.query.albumId as string;

    // Determine if this is an MBID (UUID format) or a numeric Lidarr ID
    const isMBID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        albumId
      );

    // Build endpoint based on ID type
    const endpoint = isMBID
      ? `/api/v1/music/album/mbid/${albumId}`
      : `/api/v1/music/album/${albumId}`;

    const response = await axios.get<AlbumResult>(
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
        album: response.data,
      },
    };
  } catch (error) {
    // Log error for debugging
    const errorStatus =
      error && typeof error === 'object' && 'response' in error
        ? (error.response as { status?: number })?.status
        : undefined;

    // Return 404 if album not found
    if (errorStatus === 404) {
      return {
        notFound: true,
      };
    }

    // For other errors, return empty album so the page can render an error state
    return {
      props: {
        album: undefined,
      },
    };
  }
};

export default AlbumPage;
