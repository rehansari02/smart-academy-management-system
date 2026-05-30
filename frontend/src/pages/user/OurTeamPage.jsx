import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, Clock, BookOpen, Search } from 'lucide-react';
import teamService from '../../services/teamService';
import axios from 'axios';

const OurTeamPage = () => {
    const [teamMembers, setTeamMembers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [teamData, branchData] = await Promise.all([
                teamService.getPublicTeamMembers(),
                axios.get(`${import.meta.env.VITE_API_URL}/branches/public`).then(r => r.data)
            ]);
            setTeamMembers(teamData);
            setBranches(Array.isArray(branchData) ? branchData : []);
        } catch (error) {
            console.error('Error fetching team data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter by branch and search
    const filteredMembers = teamMembers.filter(m => {
        const branchMatch = selectedBranch === 'all' || m.branch?._id === selectedBranch;
        const searchMatch = !searchTerm || 
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.profession?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.experience?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (Array.isArray(m.subjects) && m.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
        return branchMatch && searchMatch;
    });

    // Group by branch for display
    const groupedByBranch = branches.reduce((acc, branch) => {
        const members = filteredMembers.filter(m => m.branch?._id === branch._id);
        if (members.length > 0) {
            acc.push({ branch, members });
        }
        return acc;
    }, []);

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white">
                <div className="container mx-auto px-4 py-20 md:py-28">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                            <Users size={16} className="text-yellow-300" />
                            <span>Our Expert Faculty</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                            Meet Our <span className="text-yellow-300">Team</span>
                        </h1>
                        <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
                            Dedicated educators and professionals committed to shaping the future of our students through quality education.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Branch Tab Navigation & Search */}
                <div className="max-w-6xl mx-auto mb-10">
                    {/* Branch Tabs */}
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <button
                            onClick={() => setSelectedBranch('all')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                selectedBranch === 'all'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                            }`}
                        >
                            All
                        </button>
                        {branches.map(b => (
                            <button
                                key={b._id}
                                onClick={() => setSelectedBranch(b._id)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                    selectedBranch === b._id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                }`}
                            >
                                {b.name}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, profession, subject..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto">
                        <Users size={48} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No team members found</h3>
                        <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                    </div>
                ) : selectedBranch === 'all' ? (
                    /* Grouped by branch view */
                    <div className="space-y-16">
                        {groupedByBranch.map(({ branch, members }) => (
                            <motion.div
                                key={branch._id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {members.map((member, idx) => (
                                        <TeamMemberCard key={member._id} member={member} index={idx} />
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    /* Single branch view */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredMembers.map((member, idx) => (
                            <TeamMemberCard key={member._id} member={member} index={idx} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const TeamMemberCard = ({ member, index }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1"
        >
            {/* Photo */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 aspect-square">
                {member.image && !imgError ? (
                    <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Users size={40} className="text-indigo-400" />
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                    {member.name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-indigo-600 font-semibold mb-3">
                    <Briefcase size={14} />
                    <span>{member.profession}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-3 bg-gray-50 rounded-lg px-3 py-2">
                    <Clock size={14} className="text-gray-400" />
                    <span>{member.experience} Experience</span>
                </div>

                {Array.isArray(member.subjects) && member.subjects.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <BookOpen size={12} />
                            <span>Subjects</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {member.subjects.map((sub, i) => (
                                <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">
                                    {sub}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default OurTeamPage;
