import ShowMoreCard from '@app/components/MediaSlider/ShowMoreCard';
import Slider from '@app/components/Slider';
import TitleCard from '@app/components/TitleCard';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import type { AlbumResult, ArtistResult } from '@server/models/Music';
import Link from 'next/link';
import { useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';

interface MusicResult {
  page: number;
  totalResults: number;
  totalPages: number;
  results: (ArtistResult | AlbumResult)[];
}

interface MusicSliderProps {
  title: string;
  url: string;
  linkUrl?: string;
  sliderKey: string;
  hideWhenEmpty?: boolean;
}

const MusicSlider = ({
  title,
  url,
  linkUrl,
  sliderKey,
  hideWhenEmpty = false,
}: MusicSliderProps) => {
  const { data, error, setSize, size } = useSWRInfinite<MusicResult>(
    (pageIndex: number, previousPageData: MusicResult | null) => {
      if (previousPageData && pageIndex + 1 > previousPageData.totalPages) {
        return null;
      }

      return `${url}?page=${pageIndex + 1}`;
    },
    {
      initialSize: 2,
    }
  );

  const titles = (data ?? []).reduce(
    (a, v) => [...a, ...v.results],
    [] as (ArtistResult | AlbumResult)[]
  );

  useEffect(() => {
    if (
      titles.length < 24 &&
      size < 5 &&
      (data?.[0]?.totalResults ?? 0) > size * 20
    ) {
      setSize(size + 1);
    }
  }, [titles, setSize, size, data]);

  if (hideWhenEmpty && (data?.[0].results ?? []).length === 0) {
    return null;
  }

  const finalTitles = titles.slice(0, 20).map((item) => {
    if (item.mediaType === 'artist') {
      const artist = item as ArtistResult;
      return (
        <TitleCard
          key={`artist-${artist.id}`}
          id={artist.id}
          image={artist.posterPath}
          status={artist.mediaInfo?.status}
          summary={artist.overview}
          title={artist.name}
          year={artist.albumCount ? `${artist.albumCount} Albums` : ''}
          mediaType="artist"
          inProgress={(artist.mediaInfo?.downloadStatus ?? []).length > 0}
        />
      );
    } else {
      const album = item as AlbumResult;
      return (
        <TitleCard
          key={`album-${album.id}`}
          id={album.id}
          image={album.posterPath}
          status={album.mediaInfo?.status}
          summary={album.overview}
          title={album.title}
          year={album.artistName}
          mediaType="album"
          inProgress={(album.mediaInfo?.downloadStatus ?? []).length > 0}
        />
      );
    }
  });

  if (linkUrl && finalTitles.length > 0) {
    const posters = titles.slice(0, 20).map((title) => title.posterPath);
    finalTitles.push(
      <ShowMoreCard key="show-more" url={linkUrl} posters={posters} />
    );
  }

  return (
    <>
      <div className="slider-header">
        {linkUrl ? (
          <Link href={linkUrl}>
            <a className="slider-title min-w-0 pr-16">
              <span className="truncate">{title}</span>
              <ArrowRightCircleIcon />
            </a>
          </Link>
        ) : (
          <div className="slider-title">
            <span>{title}</span>
          </div>
        )}
      </div>
      <Slider
        sliderKey={sliderKey}
        isLoading={!data && !error}
        isEmpty={finalTitles.length === 0}
        items={finalTitles}
      />
    </>
  );
};

export default MusicSlider;
