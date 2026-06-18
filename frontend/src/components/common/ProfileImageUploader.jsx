import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Trash2, Edit2, X, FlipHorizontal, Crop } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getMediaUrl } from '../../utils/mediaUrl';
import { getCroppedImg } from '../../utils/cropUtils';

/**
 * ProfileImageUploader - A reusable circular avatar image uploader with camera support
 * 
 * @param {Object} props
 * @param {File|string|null} props.value - Current image (File object or URL string)
 * @param {Function} props.onChange - Callback when image changes (receives File object)
 * @param {Function} props.onDelete - Callback when image is deleted
 * @param {string} props.size - Tailwind size class (default: "w-24 h-24")
 * @param {string} props.name - Field name for form integration
 * @param {boolean} props.enableAdjustments - Show crop/position controls for final save
 */
const ProfileImageUploader = ({ 
    value, 
    onChange, 
    onDelete,
    size = "w-24 h-24",
    name = "photo",
    onProcessingChange,
    enableAdjustments = false,
}) => {
    const [preview, setPreview] = useState(null);
    const [sourcePreview, setSourcePreview] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back
    const [showHover, setShowHover] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); // Track processing state
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const localObjectUrlRef = useRef(null);

    const clearLocalObjectUrl = () => {
        if (localObjectUrlRef.current) {
            URL.revokeObjectURL(localObjectUrlRef.current);
            localObjectUrlRef.current = null;
        }
    };

    const setLocalFilePreview = (file) => {
        clearLocalObjectUrl();
        const url = URL.createObjectURL(file);
        localObjectUrlRef.current = url;
        setPreview(url);
        setSourcePreview(url);
    };

    // Update preview when value changes
    useEffect(() => {
        if (value instanceof File) {
            clearLocalObjectUrl();
            const url = URL.createObjectURL(value);
            localObjectUrlRef.current = url;
            setPreview(url);
            setSourcePreview(url);
            return;
        }

        clearLocalObjectUrl();
        if (value) {
            if (typeof value === 'string') {
                setPreview(value.startsWith('http') || value.startsWith('blob:') || value.startsWith('data:')
                    ? value
                    : getMediaUrl(value));
                setSourcePreview(value.startsWith('http') || value.startsWith('blob:') || value.startsWith('data:')
                    ? value
                    : getMediaUrl(value));
            }
        } else {
            setPreview(null);
            setSourcePreview(null);
        }
    }, [value]);

    // Cleanup camera stream on unmount or when closing camera
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    useEffect(() => {
        return () => clearLocalObjectUrl();
    }, []);

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file');
                return;
            }
            setIsProcessing(true);
            if (onProcessingChange) onProcessingChange(true);

            setLocalFilePreview(file);
            onChange(file);
            if (enableAdjustments) {
                resetCrop();
                setShowAdjustModal(true);
            }
            setIsProcessing(false);
            if (onProcessingChange) onProcessingChange(false);
        }
        e.target.value = '';
    };

    const applyCropAdjustments = async () => {
        if (!sourcePreview || !croppedAreaPixels) return;

        setIsProcessing(true);
        if (onProcessingChange) onProcessingChange(true);

        try {
            const result = await getCroppedImg(sourcePreview, croppedAreaPixels, {
                outputWidth: 600,
                outputHeight: 800,
                fileName: `student-photo-${Date.now()}.jpg`,
            });

            if (result?.file) {
                setLocalFilePreview(result.file);
                onChange(result.file);
            }
            setShowAdjustModal(false);
        } catch (error) {
            console.error('Failed to crop image:', error);
            alert('Could not adjust this image. Please try another photo.');
        } finally {
            setIsProcessing(false);
            if (onProcessingChange) onProcessingChange(false);
        }
    };

    const resetCrop = () => {
        setCrop({ x: 0, y: 0 });
        setCropZoom(1);
        setCroppedAreaPixels(null);
    };

    const openAdjustModal = () => {
        resetCrop();
        setShowAdjustModal(true);
    };

    // Open camera modal
    const openCamera = async () => {
        setCameraError(null);
        setShowCamera(true);
        
        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Camera access error:', error);
            setCameraError(
                error.name === 'NotAllowedError' 
                    ? 'Camera access denied. Please allow camera permissions.'
                    : error.name === 'NotFoundError'
                    ? 'No camera found on this device.'
                    : 'Failed to access camera. Please ensure you are using HTTPS or localhost.'
            );
        }
    };

    // Close camera modal
    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
        setCameraError(null);
    };

    // Flip camera (switch between front and back)
    const flipCamera = async () => {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);
        
        // Stop current stream
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        
        // Start new stream with flipped camera
        try {
            const constraints = {
                video: {
                    facingMode: newFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Failed to flip camera:', error);
            setCameraError('Failed to switch camera. This device may only have one camera.');
        }
    };

    // Capture photo from camera
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        setIsProcessing(true);
        if (onProcessingChange) onProcessingChange(true);
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob then to File
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                setLocalFilePreview(file);
                onChange(file);
                closeCamera();
                if (enableAdjustments) {
                    resetCrop();
                    setShowAdjustModal(true);
                }
                setIsProcessing(false);
                if (onProcessingChange) onProcessingChange(false);
            }
        }, 'image/jpeg', 0.95);
    };

    // Handle delete
    const handleDelete = () => {
        setPreview(null);
        if (onDelete) {
            onDelete();
        } else {
            onChange(null);
        }
    };

    // Handle change (re-open selection options)
    const handleChange = () => {
        fileInputRef.current?.click();
    };

    const previewFrameClass = enableAdjustments ? "h-36 w-28 rounded-lg" : `${size} rounded-full`;
    const previewImageClass = enableAdjustments ? "object-cover object-center" : "object-cover object-top";
    const hoverFrameClass = enableAdjustments ? "rounded-lg" : "rounded-full";

    return (
        <>
            <div className="flex flex-col items-center gap-2">
                {/* Avatar Container */}
                <div 
                    className={`${previewFrameClass} relative group cursor-pointer`}
                    onMouseEnter={() => setShowHover(true)}
                    onMouseLeave={() => setShowHover(false)}
                >
                    {/* Image or Empty State */}
                    <div className={`${previewFrameClass} overflow-hidden bg-white border-2 border-gray-300 flex items-center justify-center shadow-sm`}>
                        {preview ? (
                            <img 
                                src={preview} 
                                alt="Profile" 
                                className={`h-full w-full ${previewImageClass}`}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-gray-400">
                                <Upload size={enableAdjustments ? 24 : 32} />
                                {enableAdjustments && <span className="text-[10px] font-semibold">600 x 800</span>}
                            </div>
                        )}
                    </div>

                    {/* Empty State: Upload and Camera Buttons */}
                    {!preview && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                                title="Upload Image"
                            >
                                <Upload size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={openCamera}
                                className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg hover:bg-green-700 transition-colors"
                                title="Take Photo"
                            >
                                <Camera size={14} />
                            </button>
                        </div>
                    )}

                    {/* Filled State: Delete and Change Buttons (visible on hover) */}
                    {preview && showHover && (
                        <div className={`absolute inset-0 ${hoverFrameClass} bg-black/40 flex items-center justify-center gap-2 transition-opacity`}>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors"
                                title="Delete Image"
                            >
                                <Trash2 size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={handleChange}
                                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                                title="Change Image"
                            >
                                <Edit2 size={14} />
                            </button>
                            {enableAdjustments && preview && (
                                <button
                                    type="button"
                                    onClick={openAdjustModal}
                                    className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg hover:bg-amber-700 transition-colors"
                                    title="Adjust Image"
                                >
                                    <Crop size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    name={name}
                />

                {/* Hidden canvas for photo capture */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Camera size={20} className="text-blue-600" />
                                Take Photo
                            </h3>
                            <button
                                onClick={closeCamera}
                                className="text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Camera View */}
                        <div className="relative bg-black">
                            {cameraError ? (
                                <div className="flex items-center justify-center min-h-[400px] p-8">
                                    <div className="text-center">
                                        <div className="text-red-500 mb-4">
                                            <Camera size={48} className="mx-auto" />
                                        </div>
                                        <p className="text-white text-lg font-semibold mb-2">Camera Error</p>
                                        <p className="text-gray-300 text-sm max-w-md">{cameraError}</p>
                                    </div>
                                </div>
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-auto max-h-[60vh] object-contain"
                                />
                            )}
                        </div>

                        {/* Camera Controls */}
                        {!cameraError && (
                            <div className="flex justify-center items-center gap-4 p-6 bg-gray-50 border-t">
                                <button
                                    type="button"
                                    onClick={flipCamera}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <FlipHorizontal size={18} />
                                    Flip Camera
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold shadow-lg"
                                >
                                    <Camera size={20} />
                                    Capture
                                </button>
                                <button
                                    type="button"
                                    onClick={closeCamera}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAdjustModal && (sourcePreview || preview) && enableAdjustments && (
                <div className="fixed inset-0 z-[9998] bg-black/80 flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <Crop size={20} className="text-blue-600" />
                                Adjust Photo
                            </h3>
                            <button type="button" onClick={() => setShowAdjustModal(false)} className="text-gray-500 hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
                            <div className="rounded-xl bg-gray-100 p-4">
                                <div className="relative mx-auto h-[420px] w-full max-w-[315px] overflow-hidden rounded-lg border-2 border-gray-300 bg-black">
                                    <Cropper
                                        image={sourcePreview || preview}
                                        crop={crop}
                                        zoom={cropZoom}
                                        aspect={3 / 4}
                                        cropShape="rect"
                                        showGrid
                                        objectFit="contain"
                                        onCropChange={setCrop}
                                        onZoomChange={setCropZoom}
                                        onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                                    />
                                </div>
                                <p className="mt-2 text-center text-xs font-semibold text-gray-600">
                                    Final size: 600 x 800 px
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">Zoom</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="2.5"
                                        step="0.01"
                                        value={cropZoom}
                                        onChange={(e) => setCropZoom(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs font-medium text-blue-800">
                                    Photo ko drag karke face/frame set karein. Box ke andar jitna part dikhega, wahi exact save hoga.
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={resetCrop}
                                        className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-300"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyCropAdjustments}
                                        disabled={!croppedAreaPixels || isProcessing}
                                        className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {isProcessing ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfileImageUploader;
