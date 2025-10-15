import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { postsApi } from '../../api/posts';
import { PostCard } from '../../components/Post/PostCard';
import { SearchBar } from '../../components/Search/SearchBar';
import { Button, Card } from '../../components/UI';
import { POST_CATEGORIES, PostCategory } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface PostListPageProps {
  showMyPosts?: boolean;
}

export const PostListPage: React.FC<PostListPageProps> = ({ showMyPosts = false }) => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [empathyLoading, setEmpathyLoading] = useState<string | null>(null);

  // Infinite query for posts
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['posts', showMyPosts, selectedCategory],
    queryFn: async ({ pageParam = 0 }) => {
      if (showMyPosts) {
        return await postsApi.getMyPosts({
          skip: pageParam,
          limit: 10
        });
      } else {
        return await postsApi.getPosts({
          skip: pageParam,
          limit: 10,
          category: selectedCategory || undefined
        });
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.items.length === 10 ? totalFetched : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Search query for posts
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: searchRefetch
  } = useInfiniteQuery({
    queryKey: ['posts-search', searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      return await postsApi.searchPosts({
        q: searchQuery,
        skip: pageParam,
        limit: 10,
        sort_by: 'relevance'
      });
    },
    enabled: searchQuery.length >= 2,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.items.length === 10 ? totalFetched : undefined;
    },
  });

  const handleEmpathyToggle = async (postId: string) => {
    if (!user) return;
    
    setEmpathyLoading(postId);
    try {
      await postsApi.toggleEmpathy(postId);
      // Refetch to update the post data
      refetch();
      if (searchQuery) {
        searchRefetch();
      }
    } catch (error) {
      console.error('Failed to toggle empathy:', error);
    } finally {
      setEmpathyLoading(null);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
    setShowFilters(false);
  };

  // Use search results if searching, otherwise use regular posts
  const postsToShow = searchQuery.length >= 2 ? searchResults : data;
  const isLoadingPosts = searchQuery.length >= 2 ? isSearching : isLoading;

  // Flatten all pages into a single array
  const allPosts = postsToShow?.pages.flatMap(page => page.items) || [];

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">게시물을 불러오는데 실패했습니다.</p>
          <Button onClick={() => refetch()}>다시 시도</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {showMyPosts ? '내 게시물' : '공감노트'}
            </h1>
            <Link to="/empathy-notes/create">
              <Button className="flex items-center space-x-2">
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">글쓰기</span>
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <SearchBar
              onSearch={handleSearch}
              placeholder="게시물을 검색해보세요..."
              className="w-full"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              <span>카테고리</span>
              {selectedCategory && (
                <span className="bg-indigo-600 text-white rounded-full px-2 py-0.5 text-xs">
                  1
                </span>
              )}
            </button>

            {/* Filter Tags */}
            {selectedCategory && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">필터:</span>
                <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                  {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Category Filter Dropdown */}
          {showFilters && (
            <Card className="mt-4 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">카테고리 선택</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {POST_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryFilter(category)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedCategory === category
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery.length >= 2 && searchResults && (
          <div className="mb-4 text-sm text-gray-600">
            <span>"{searchQuery}" 검색결과 </span>
            <span className="font-medium">
              {searchResults.pages[0]?.total || 0}건
            </span>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {isLoadingPosts ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="p-6 animate-pulse">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                  <div className="h-8 bg-gray-300 rounded w-20"></div>
                </div>
              </Card>
            ))
          ) : allPosts.length > 0 ? (
            allPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEmpathyToggle={handleEmpathyToggle}
                isLoading={empathyLoading === post.id}
              />
            ))
          ) : (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                {searchQuery.length >= 2 ? (
                  <>
                    <p className="mb-2">검색 결과가 없습니다.</p>
                    <p className="text-sm">다른 키워드로 검색해보세요.</p>
                  </>
                ) : showMyPosts ? (
                  <>
                    <p className="mb-4">아직 작성한 게시물이 없습니다.</p>
                    <Link to="/empathy-notes/create">
                      <Button>첫 번째 글 쓰기</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mb-4">아직 게시물이 없습니다.</p>
                    <Link to="/empathy-notes/create">
                      <Button>첫 번째 글 쓰기</Button>
                    </Link>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Load More Button */}
        {hasNextPage && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              className="px-8"
            >
              {isFetchingNextPage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent mr-2" />
                  불러오는 중...
                </>
              ) : (
                '더 보기'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};