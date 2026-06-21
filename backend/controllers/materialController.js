const asyncHandler = require('express-async-handler');
const Material = require('../models/Material');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

const isRemoteDocument = (document) => /^https?:\/\//i.test(document || '');

const isBareExtensionValue = (document) => /^\.[a-z0-9]+$/i.test(String(document || '').trim());

const getCloudinaryPublicId = (document) => {
    if (!isRemoteDocument(document)) return '';
    try {
        const url = new URL(document);
        const match = url.pathname.match(/\/upload\/(?:v\d+\/)?(.+)$/);
        return match ? decodeURIComponent(match[1]) : '';
    } catch (err) {
        return '';
    }
};

const normalizeUploadedDocumentPath = (file) => {
    if (!file) return null;
    return (
        file.secure_url ||
        file.url ||
        file.path ||
        file.filename ||
        ''
    ).replace(/\\/g, '/');
};

const getFileExtension = (document) => {
    if (!document) return '';
    const value = String(document).trim();
    if (isBareExtensionValue(value)) {
        return value.toLowerCase();
    }
    try {
        if (isRemoteDocument(value)) {
            const url = new URL(value);
            return path.extname(url.pathname).toLowerCase();
        }
    } catch (err) {
        // fall through to path.extname
    }
    return path.extname(value).toLowerCase();
};

const resolveRemoteFileExtension = async (document) => {
    const currentExt = getFileExtension(document);
    if (currentExt) return currentExt;
    if (!isRemoteDocument(document)) return '';

    const publicId = getCloudinaryPublicId(document);
    if (!publicId) return '';

    try {
        const resource = await cloudinary.api.resource(publicId, {
            resource_type: 'raw'
        });

        if (resource?.format) {
            return `.${String(resource.format).toLowerCase()}`;
        }
    } catch (err) {
        // keep falling back
    }

    try {
        const response = await axios.get(document, {
            responseType: 'arraybuffer',
            headers: { Range: 'bytes=0-15' },
            validateStatus: () => true,
            timeout: 8000
        });
        const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
        const bytes = Buffer.from(response.data || []);
        return getExtensionFromContent(contentType, bytes);
    } catch (err) {
        // keep falling back
    }

    return '';
};

const getExtensionFromContent = (contentType = '', bytes = Buffer.alloc(0)) => {
    const type = String(contentType || '').toLowerCase();
    if (type.includes('pdf')) return '.pdf';
    if (type.includes('wordprocessingml')) return '.docx';
    if (type.includes('msword')) return '.doc';
    if (type.includes('presentationml')) return '.pptx';
    if (type.includes('spreadsheetml')) return '.xlsx';
    if (type.includes('image/png')) return '.png';
    if (type.includes('image/jpeg')) return '.jpg';
    if (type.includes('image/webp')) return '.webp';

    const signature = bytes.slice(0, 8).toString('utf8');
    if (signature.startsWith('%PDF')) return '.pdf';
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
        return '.docx';
    }
    return '';
};

const resolveLocalDocumentPath = (document) => {
    if (!document || isRemoteDocument(document) || isBareExtensionValue(document)) {
        return '';
    }

    const normalized = String(document).replace(/\\/g, '/').replace(/^\/+/, '');
    const candidates = [
        path.resolve(normalized),
        path.resolve(__dirname, '..', normalized),
        path.resolve(__dirname, '..', '..', normalized)
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return candidates[0];
};

const getDocumentUrl = (req, document) => {
    if (!document) return '';
    if (isBareExtensionValue(document)) return '';
    if (isRemoteDocument(document)) return document;
    const normalized = String(document).replace(/\\/g, '/').replace(/^\/+/, '');
    return `${req.protocol}://${req.get('host')}/${normalized}`;
};

const hasResolvableLocalSource = (document) => {
    if (!document || isBareExtensionValue(document)) return false;
    const filePath = resolveLocalDocumentPath(document);
    return Boolean(filePath && fs.existsSync(filePath));
};

const getContentTypeByExtension = (ext) => {
    switch (ext) {
        case '.pdf':
            return 'application/pdf';
        case '.docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.doc':
            return 'application/msword';
        case '.pptx':
            return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case '.ppt':
            return 'application/vnd.ms-powerpoint';
        case '.xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case '.xls':
            return 'application/vnd.ms-excel';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        default:
            return 'application/octet-stream';
    }
};

// @desc    Get all materials with filters
// @route   GET /api/materials
// @access  Private/Public (depending on type)
const getMaterials = asyncHandler(async (req, res) => {
    const { fromDate, toDate, type, searchBy, value, isActive } = req.query;

    let query = {};

    // Date Filter
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt.$lte = endOfDay;
        }
    }

    // Type Filter
    if (type && type !== 'All' && type !== '') {
        query.type = type;
    }
    
    // Search By (Subject Name or Title)
    if (searchBy && value) {
        if (searchBy === 'title') {
            query.title = { $regex: value, $options: 'i' };
        }
    }

    if (isActive) {
        query.isActive = isActive === 'true';
    }

    // Student View Filter (Public + Student accessible)
    if (req.query.studentView === 'true') {
        query.type = { $in: ['Public', 'Student only', 'Student and Faculty only'] };
        query.isActive = true; // Force active only
    }

    let materials = await Material.find(query)
        .populate('subject', 'name')
        .sort({ createdAt: -1 });

    // Post-query filtering for Subject Name if needed
    if (searchBy === 'subject' && value) {
        materials = materials.filter(m => m.subject?.name?.toLowerCase().includes(value.toLowerCase()));
    }

    res.json(materials);
});

// @desc    Preview material document inline
// @route   GET /api/materials/preview/:id
// @access  Public
const previewMaterial = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);
    if (!material || !material.document) {
        res.status(404);
        throw new Error('Document not found');
    }

    const ext = isRemoteDocument(material.document)
        ? await resolveRemoteFileExtension(material.document)
        : getFileExtension(material.document);
    const documentUrl = getDocumentUrl(req, material.document);

    if (isRemoteDocument(material.document)) {
        return res.redirect(documentUrl);
    }

    const filePath = resolveLocalDocumentPath(material.document);
    if (!fs.existsSync(filePath)) {
        res.status(404);
        throw new Error('File not found on server');
    }

    if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${material.title || 'material'}.pdf"`);
    }

    res.sendFile(filePath);
});

// @desc    Stream raw material bytes for in-app previews
// @route   GET /api/materials/raw/:id
// @access  Public
const getRawMaterial = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);
    if (!material || !material.document) {
        res.status(404);
        throw new Error('Document not found');
    }

    const ext = await resolveRemoteFileExtension(material.document);
    const contentType = getContentTypeByExtension(ext);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    if (isRemoteDocument(material.document)) {
        const response = await axios.get(material.document, {
            responseType: 'stream',
            validateStatus: () => true
        });

        if (response.status >= 400) {
            res.status(response.status);
            throw new Error('Remote file could not be fetched');
        }

        const remoteContentType = String(response.headers['content-type'] || '').toLowerCase();
        if (remoteContentType && remoteContentType !== 'application/octet-stream') {
            res.setHeader('Content-Type', response.headers['content-type']);
        }

        response.data.pipe(res);
        return;
    }

    const filePath = resolveLocalDocumentPath(material.document);
    if (!fs.existsSync(filePath)) {
        res.status(404);
        throw new Error('File not found on server');
    }

    res.sendFile(filePath);
});

// @desc    Get material preview metadata
// @route   GET /api/materials/preview-meta/:id
// @access  Public
const getMaterialPreviewMeta = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id).populate('subject', 'name');
    if (!material || !material.document) {
        res.status(404);
        throw new Error('Material not found');
    }

    const documentUrl = getDocumentUrl(req, material.document);
    const extension = await resolveRemoteFileExtension(material.document);

    res.json({
        _id: material._id,
        title: material.title,
        description: material.description,
        type: material.type,
        subject: material.subject,
        document: material.document,
        documentUrl,
        extension,
        showDownloadButton: material.showDownloadButton !== false,
        isActive: material.isActive,
        hasDocumentSource: isRemoteDocument(material.document) || hasResolvableLocalSource(material.document),
        isLegacyPlaceholder: isBareExtensionValue(material.document)
    });
});

// @desc    Download material document
// @route   GET /api/materials/download/:id
// @access  Public
const downloadMaterial = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);
    if (!material || !material.document) {
        res.status(404); throw new Error('Document not found');
    }

    const ext = await resolveRemoteFileExtension(material.document);
    if (isRemoteDocument(material.document)) {
        return res.redirect(material.document);
    }

    const filePath = resolveLocalDocumentPath(material.document);
    if (!fs.existsSync(filePath)) {
        res.status(404); throw new Error('File not found on server');
    }

    const safeTitle = material.title.replace(/[^a-zA-Z0-9]/g, "_");
    const downloadFileName = `${safeTitle}${ext}`;

    res.download(filePath, downloadFileName);
});

// @desc    Create new material
// @route   POST /api/materials
// @access  Private/Admin
const createMaterial = asyncHandler(async (req, res) => {
    const { subject, title, type, description, showDownloadButton, isActive } = req.body;
    const documentPath = normalizeUploadedDocumentPath(req.file);

    const material = await Material.create({
        subject,
        title,
        type,
        document: documentPath,
        description,
        showDownloadButton: showDownloadButton === 'true' || showDownloadButton === true,
        isActive: isActive === 'true' || isActive === true
    });

    const populatedMaterial = await Material.findById(material._id).populate('subject', 'name');
    res.status(201).json(populatedMaterial);
});

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private/Admin
const updateMaterial = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Material not found');
    }

    const { subject, title, type, description, showDownloadButton, isActive } = req.body;

    if (subject) material.subject = subject;
    if (title) material.title = title;
    if (type) material.type = type;
    if (description !== undefined) material.description = description;
    if (showDownloadButton !== undefined) {
        material.showDownloadButton = (showDownloadButton === 'true' || showDownloadButton === true);
    }
    if (isActive !== undefined) material.isActive = (isActive === 'true' || isActive === true);

    if (req.file) {
        if (material.document) {
            if (isRemoteDocument(material.document)) {
                const publicId = getCloudinaryPublicId(material.document);
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId, {
                            resource_type: 'auto'
                        });
                    } catch (err) {}
                }
            } else if (fs.existsSync(material.document) && material.document.startsWith('uploads')) {
                try { fs.unlinkSync(material.document); } catch (err) {}
            }
        }
        material.document = normalizeUploadedDocumentPath(req.file);
    }

    const updatedMaterial = await material.save();
    const populatedUpdatedMaterial = await Material.findById(updatedMaterial._id).populate('subject', 'name');
    res.json(populatedUpdatedMaterial);
});

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private/Admin
const deleteMaterial = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Material not found');
    }

    if (material.document) {
        if (isRemoteDocument(material.document)) {
            const publicId = getCloudinaryPublicId(material.document);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, {
                        resource_type: 'auto'
                    });
                } catch (err) {}
            }
        } else if (fs.existsSync(material.document) && material.document.startsWith('uploads')) {
            try { fs.unlinkSync(material.document); } catch (err) {}
        }
    }

    await material.deleteOne();
    res.json({ message: 'Material removed' });
});

module.exports = {
    getMaterials,
    previewMaterial,
    getMaterialPreviewMeta,
    getRawMaterial,
    downloadMaterial,
    createMaterial,
    updateMaterial,
    deleteMaterial
};
