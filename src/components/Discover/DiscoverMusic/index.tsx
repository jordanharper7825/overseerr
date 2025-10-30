import Header from '@app/components/Common/Header';
import ListView from '@app/components/Common/ListView';
import PageTitle from '@app/components/Common/PageTitle';
import useDiscover from '@app/hooks/useDiscover';
import { useUpdateQueryParams } from '@app/hooks/useUpdateQueryParams';
import Error from '@app/pages/_error';
import { BarsArrowDownIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  discovermusic: 'Music',
  sortAlphabetical: 'Alphabetical (A-Z)',
  sortAlbumCount: 'Most Albums',
  sortRecentlyAdded: 'Recently Added',
});

const SortOptions = {
  Alphabetical: 'name',
  AlbumCount: 'albumCount',
  RecentlyAdded: 'dateAdded',
} as const;

interface ArtistResult {
  id: number;
  mediaType: 'artist';
  name: string;
  foreignId: string;
  overview: string;
  posterPath?: string;
  disambiguation?: string;
  artistType?: string;
  albumCount?: number;
}

const DiscoverMusic = () => {
  const intl = useIntl();
  const router = useRouter();
  const updateQueryParams = useUpdateQueryParams({});

  const sortBy = (router.query.sortBy as string) || SortOptions.AlbumCount;

  const {
    isLoadingInitialData,
    isEmpty,
    isLoadingMore,
    isReachingEnd,
    titles,
    fetchMore,
    error,
  } = useDiscover<ArtistResult>('/api/v1/discover/music', { sortBy });

  if (error) {
    return <Error statusCode={500} />;
  }

  const title = intl.formatMessage(messages.discovermusic);

  return (
    <>
      <PageTitle title={title} />
      <div className="mb-4 flex flex-col justify-between lg:flex-row lg:items-end">
        <Header>{title}</Header>
        <div className="mt-2 flex flex-grow flex-col sm:flex-row lg:flex-grow-0">
          <div className="mb-2 flex flex-grow sm:mb-0 lg:flex-grow-0">
            <span className="inline-flex cursor-default items-center rounded-l-md border border-r-0 border-gray-500 bg-gray-800 px-3 text-gray-100 sm:text-sm">
              <BarsArrowDownIcon className="h-6 w-6" />
            </span>
            <select
              id="sortBy"
              name="sortBy"
              className="rounded-r-only"
              value={sortBy}
              onChange={(e) => updateQueryParams('sortBy', e.target.value)}
            >
              <option value={SortOptions.AlbumCount}>
                {intl.formatMessage(messages.sortAlbumCount)}
              </option>
              <option value={SortOptions.Alphabetical}>
                {intl.formatMessage(messages.sortAlphabetical)}
              </option>
              <option value={SortOptions.RecentlyAdded}>
                {intl.formatMessage(messages.sortRecentlyAdded)}
              </option>
            </select>
          </div>
        </div>
      </div>
      <ListView
        items={titles}
        isEmpty={isEmpty}
        isLoading={
          isLoadingInitialData || (isLoadingMore && (titles?.length ?? 0) > 0)
        }
        isReachingEnd={isReachingEnd}
        onScrollBottom={fetchMore}
      />
    </>
  );
};

export default DiscoverMusic;
