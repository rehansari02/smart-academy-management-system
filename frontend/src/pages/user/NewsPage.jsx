import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, ExternalLink, Search, X } from 'lucide-react';
import newsService from '../../services/newsService';
import { formatDate } from '../../utils/dateUtils';
import Reveal from '../../components/Reveal';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        const data = await newsService.getPublicNews({ limit: '100' });
        setNews(Array.isArray(data) ? data : []);
      } catch (error) {
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  const filteredNews = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return news.filter((item) => {
      const matchesSearch = !query
        || item.title?.toLowerCase().includes(query)
        || item.smallDetail?.toLowerCase().includes(query)
        || item.description?.toLowerCase().includes(query);
      const matchesFilter = filter === 'all' || (filter === 'breaking' && item.isBreaking);
      return matchesSearch && matchesFilter;
    });
  }, [news, searchTerm, filter]);

  const featuredNews = filteredNews[0];
  const remainingNews = featuredNews ? filteredNews.slice(1) : filteredNews;

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-900 py-24 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <Reveal>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-orange-900/20">
              <Calendar size={32} />
            </div>
            <h1 className="mb-4 text-4xl font-black md:text-6xl">News & Events</h1>
            <p className="mx-auto max-w-2xl text-lg text-blue-100">
              Latest campus updates, announcements, batches, results and institute news.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white py-8">
        <div className="container mx-auto flex flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search news..."
              className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {/* <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${filter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All News
            </button>
            <button
              onClick={() => setFilter('breaking')}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${filter === 'breaking' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Breaking
            </button>
          </div> */}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {Array(6).fill(0).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-2xl bg-white p-6 shadow-sm">
                  <div className="mb-5 h-36 rounded-xl bg-gray-200" />
                  <div className="mb-3 h-5 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
              <Calendar className="mx-auto mb-4 text-gray-300" size={44} />
              <p className="text-lg font-semibold text-gray-500">No news found.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {featuredNews && (
                <Reveal>
                  <button
                    type="button"
                    onClick={() => setSelectedNews(featuredNews)}
                    className="grid w-full overflow-hidden rounded-3xl bg-white text-left shadow-xl shadow-blue-950/10 transition hover:-translate-y-1 hover:shadow-2xl lg:grid-cols-2"
                  >
                    <div className="min-h-[280px] bg-gray-100">
                      <img
                        src={featuredNews.image || 'https://placehold.co/900x600/e5e7eb/1f2937?text=Smart+Institute+News'}
                        alt={featuredNews.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center p-8 md:p-10">
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
                          <Calendar size={13} /> {formatDate(featuredNews.releaseDate)}
                        </span>
                        {featuredNews.isBreaking && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-600">
                            <AlertCircle size={13} /> Breaking
                          </span>
                        )}
                      </div>
                      <h2 className="mb-4 text-3xl font-black leading-tight text-gray-900 md:text-4xl">{featuredNews.title}</h2>
                      <p className="mb-6 line-clamp-4 text-base leading-relaxed text-gray-600">
                        {featuredNews.smallDetail || featuredNews.description || 'Read the latest update from Smart Institute.'}
                      </p>
                      <span className="font-bold text-primary">Read full update</span>
                    </div>
                  </button>
                </Reveal>
              )}

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {remainingNews.map((item, index) => (
                  <Reveal key={item._id} delay={Math.min(index * 0.04, 0.3)}>
                    <button
                      type="button"
                      onClick={() => setSelectedNews(item)}
                      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10"
                    >
                      <div className="h-48 overflow-hidden bg-gray-100">
                        <img
                          src={item.image || 'https://placehold.co/700x450/e5e7eb/1f2937?text=Smart+Institute+News'}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-500 hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <Calendar size={12} /> {formatDate(item.releaseDate)}
                          </span>
                          {item.isBreaking && (
                            <span className="rounded bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-600">Breaking</span>
                          )}
                        </div>
                        <h3 className="mb-3 line-clamp-2 text-xl font-black leading-tight text-gray-900">{item.title}</h3>
                        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
                          {item.smallDetail || item.description || 'Read the latest update from Smart Institute.'}
                        </p>
                        <span className="mt-5 font-bold text-primary">Read More</span>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedNews(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="relative bg-gradient-to-r from-primary to-blue-700 p-6 text-white">
              <button type="button" onClick={() => setSelectedNews(null)} className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-white/20">
                <X size={24} />
              </button>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold">
                  <Calendar size={14} /> {formatDate(selectedNews.releaseDate)}
                </span>
                {selectedNews.isBreaking && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-black uppercase">
                    <AlertCircle size={14} /> Breaking News
                  </span>
                )}
              </div>
              <h2 className="pr-10 text-2xl font-black leading-tight md:text-3xl">{selectedNews.title}</h2>
            </div>

            <div className="max-h-[calc(90vh-210px)] overflow-y-auto p-6 md:p-8">
              {selectedNews.image && (
                <img src={selectedNews.image} alt={selectedNews.title} className="mb-6 max-h-80 w-full rounded-2xl border border-gray-100 object-cover" />
              )}
              {selectedNews.smallDetail && (
                <p className="mb-5 border-b border-gray-200 pb-5 text-lg font-semibold leading-relaxed text-gray-700">{selectedNews.smallDetail}</p>
              )}
              <div className="whitespace-pre-wrap text-base leading-8 text-gray-600">
                {selectedNews.description || 'No detailed description available.'}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 md:px-8">
              {selectedNews.linkUrl && (
                <a href={selectedNews.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white transition hover:bg-blue-700">
                  {selectedNews.linkLabel || 'Open Link'} <ExternalLink size={16} />
                </a>
              )}
              <button type="button" onClick={() => setSelectedNews(null)} className="rounded-xl bg-gray-900 px-5 py-2.5 font-bold text-white transition hover:bg-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
