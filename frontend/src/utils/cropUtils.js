// A helper function to create a canvas and extract the cropped image
export const getCroppedImg = async (imageSrc, pixelCrop, options = {}) => {
    const {
        outputWidth = pixelCrop.width,
        outputHeight = pixelCrop.height,
        fileName = 'cropped_image.jpg',
        quality = 0.95,
    } = options;

    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (error) => reject(error));
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputWidth,
        outputHeight
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            blob.name = fileName;
            
            // Create a File object
            const file = new File([blob], blob.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });
            
            resolve({ file, url: URL.createObjectURL(blob) });
        }, 'image/jpeg', quality);
    });
};
