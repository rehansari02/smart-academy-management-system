import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { fetchBlogs } from '../../features/blog/blogSlice';
import moment from 'moment';
import { 
  Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, 
  ArrowRight, Calendar, Clock, User, Heart, MessageCircle, Share2,
  Search, Filter, TrendingUp, BookOpen, Award, Users, Camera
} from 'lucide-react';
import { motion } from 'framer-motion';

// Import logo from assets
import logoImage from '../../assets/logo2.png';
import Reveal from '../../components/Reveal';

const BlogPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { blogs = [] } = useSelector((state) => state.blogs);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    dispatch(fetchBlogs());
  }, [dispatch]);

  const categories = ['all', 'Education', 'Tech', 'General', 'News', 'Career', 'Success Stories'];
  
  // Only show published and non-deleted blogs
  const publishedBlogs = blogs.filter(blog => blog.isPublished && !blog.isDeleted);

  const filteredPosts = publishedBlogs.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = (post.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                         (post.content?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPosts = publishedBlogs.filter(post => post.views > 10 || post.isPublished).slice(0, 5); // Fallback for featured

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* 4. Hero Section */}
      <div className="relative bg-gradient-to-br from-primary to-blue-800 py-32 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center text-white"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-accent rounded-full flex items-center justify-center">
              <BookOpen size={40} />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Our <span className="text-accent">Blog</span></h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Insights, stories, and updates from the world of education and technology
            </p>
          </motion.div>
        </div>
      </div>

      {/* 5. Featured Posts */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured <span className="text-primary">Articles</span></h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Hand-picked stories that matter to our community</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {featuredPosts.slice(0, 2).map((post, index) => (
                <motion.div 
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all group"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={post.image ? (post.image.startsWith('http') ? post.image : `http://localhost:5000/${post.image}`) : 'https://placehold.co/800x400/png?text=Smart+Institute'} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-bold">
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-accent font-semibold text-sm">{post.category}</span>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock size={14} />
                        <span>5 min read</span>
                      </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed line-clamp-2">{post.excerpt || (post.content?.substring(0, 150) + '...')}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-primary font-bold">
                           {post.authorName?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{post.authorName}</p>
                          <p className="text-xs text-gray-500">{moment(post.createdAt).format('LL')}</p>
                        </div>
                      </div>
                      <Link to={`/blog/${post.slug}`} className="text-primary font-semibold hover:text-blue-700 flex items-center gap-2">
                        Read More <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* 6. Search and Filter */}
      <div className="py-12 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              
              <div className="flex flex-wrap justify-center gap-3">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* 7. All Blog Posts */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Latest <span className="text-primary">Articles</span></h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Stay updated with our latest insights and stories</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <motion.div 
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all group cursor-pointer"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={post.image ? (post.image.startsWith('http') ? post.image : `http://localhost:5000/${post.image}`) : 'https://placehold.co/800x400/png?text=Smart+Institute'} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-accent font-semibold text-xs uppercase">{post.category}</span>
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Clock size={12} />
                        <span>4 min read</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm line-clamp-3">{post.excerpt || (post.content?.substring(0, 100) + '...')}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-[10px] text-primary font-bold">
                           {post.authorName?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{post.authorName}</p>
                          <p className="text-xs text-gray-500">{moment(post.createdAt).format('ll')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <div className="flex items-center gap-1">
                          <TrendingUp size={14} />
                          <span className="text-xs">{post.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No articles found matching your criteria</p>
              </div>
            )}
          </Reveal>
        </div>
      </div>

      {/* 8. Newsletter */}
      <div className="py-20 bg-gradient-to-br from-primary to-blue-800 text-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Subscribe to Our <span className="text-accent">Newsletter</span></h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Get the latest articles and updates delivered straight to your inbox
              </p>
              <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg text-gray-900 outline-none w-full"
                />
                <button className="bg-accent hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition-colors w-full sm:w-auto">
                  Subscribe
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* 9. Blog Stats */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Blog <span className="text-primary">Statistics</span></h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Numbers that show our reach and impact</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">150+</div>
                <div className="text-gray-600">Articles Published</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">50K+</div>
                <div className="text-gray-600">Monthly Readers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">25+</div>
                <div className="text-gray-600">Expert Writers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">10K+</div>
                <div className="text-gray-600">Subscribers</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
