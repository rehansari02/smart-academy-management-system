import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Image as ImageIcon, Save } from 'lucide-react';
import homeSectionService from '../../../services/homeSectionService';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const SECTIONS = [
    {
        key: 'md_message',
        label: 'Section 1 — MD Message (Image Left)',
        fields: ['title', 'subtitle', 'quote', 'description', 'buttonLabel']
    },
    {
        key: 'heritage',
        label: 'Section 2 — Our Heritage (Image Right)',
        fields: ['title', 'subtitle', 'description']
    }
];

const defaultForm = { title: '', subtitle: '', description: '', quote: '', buttonLabel: '', isActive: true };

const ManageHomeSections = () => {
    const [data, setData] = useState({ md_message: { ...defaultForm }, heritage: { ...defaultForm } });
    const [previews, setPreviews] = useState({ md_message: null, heritage: null });
    const [files, setFiles] = useState({ md_message: null, heritage: null });
    const [saving, setSaving] = useState({ md_message: false, heritage: false });
    const { edit } = useUserRights('Home Sub-Sections');

    useEffect(() => {
        homeSectionService.getAllSections().then(sections => {
            const updated = { ...data };
            sections.forEach(s => {
                if (updated[s.sectionKey] !== undefined) {
                    updated[s.sectionKey] = { ...defaultForm, ...s };
                    setPreviews(prev => ({ ...prev, [s.sectionKey]: s.image || null }));
                }
            });
            setData(updated);
        }).catch(() => toast.error('Failed to load sections'));
    }, []);

    const handleChange = (key, field, value) => {
        setData(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    const handleImage = (key, e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFiles(prev => ({ ...prev, [key]: file }));
        setPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
        e.target.value = '';
    };

    const handleSave = async (key) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit home sub-sections.");
            return;
        }
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            const form = new FormData();
            form.append('sectionKey', key);
            const fields = data[key];
            Object.keys(fields).forEach(f => {
                if (f !== 'image' && f !== '_id' && f !== '__v' && f !== 'sectionKey')
                    form.append(f, fields[f]);
            });
            if (files[key]) form.append('image', files[key]);
            await homeSectionService.upsertSection(form);
            toast.success('Section saved successfully');
        } catch {
            toast.error('Failed to save section');
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl space-y-8">
            <div className="flex items-center gap-3 border-b pb-4">
                <ImageIcon className="text-indigo-500" size={28} />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Manage Home Sub-Banner Sections</h2>
                    <p className="text-sm text-gray-500">Edit the two zigzag sections below the hero slider</p>
                </div>
            </div>

            {SECTIONS.map(({ key, label, fields }) => (
                <div key={key} className="bg-white rounded-xl shadow p-6 space-y-4">
                    <h3 className="font-bold text-lg text-indigo-700 border-b pb-2">{label}</h3>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section Image</label>
                        <div className="flex items-center gap-4">
                            <div className="w-48 h-28 rounded-lg overflow-hidden border bg-gray-100 flex items-center justify-center shrink-0">
                                {previews[key]
                                    ? <img src={previews[key]} alt="preview" className="w-full h-full object-cover" />
                                    : <ImageIcon size={32} className="text-gray-300" />
                                }
                            </div>
                            <label className="cursor-pointer px-4 py-2 bg-indigo-50 border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100">
                                Choose Image
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(key, e)} />
                            </label>
                        </div>
                    </div>

                    {fields.includes('title') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" value={data[key].title} onChange={e => handleChange(key, 'title', e.target.value)}
                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g. Message For All Of You By Smart Group" />
                        </div>
                    )}
                    {fields.includes('subtitle') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle / Badge Text</label>
                            <input type="text" value={data[key].subtitle} onChange={e => handleChange(key, 'subtitle', e.target.value)}
                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g. Our Heritage" />
                        </div>
                    )}
                    {fields.includes('quote') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quote (Hindi / English)</label>
                            <input type="text" value={data[key].quote} onChange={e => handleChange(key, 'quote', e.target.value)}
                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-400" placeholder='e.g. " बच्चो की तकनिकी शिक्षा..."' />
                        </div>
                    )}
                    {fields.includes('description') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea rows={3} value={data[key].description} onChange={e => handleChange(key, 'description', e.target.value)}
                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-400 resize-none" placeholder="Section description..." />
                        </div>
                    )}
                    {fields.includes('buttonLabel') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                            <input type="text" value={data[key].buttonLabel} onChange={e => handleChange(key, 'buttonLabel', e.target.value)}
                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g. Managing Director" />
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={data[key].isActive}
                                onChange={e => handleChange(key, 'isActive', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-sm font-medium text-gray-700">Show on Website</span>
                        </label>
                        <button onClick={() => handleSave(key)} disabled={saving[key]}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium">
                            <Save size={16} /> {saving[key] ? 'Saving...' : 'Save Section'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ManageHomeSections;
