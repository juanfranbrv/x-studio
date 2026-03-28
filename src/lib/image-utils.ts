/**
 * Utility function to resize and compress images on the client side.
 * This helps in staying within payload limits for API requests.
 */

export interface ResizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0 to 1
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Resizes an image (from File or data URL) and returns it as a base64 string.
 */
export async function resizeImage(
    input: File | string,
    options: ResizeOptions = {}
): Promise<string> {
    const {
        maxWidth = 1536,
        maxHeight = 1536,
        quality = 0.8,
        format = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions maintainting aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            // Create canvas and draw resized image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // High quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);

            // Export to base64
            const dataUrl = canvas.toDataURL(format, quality);
            resolve(dataUrl);
        };

        img.onerror = (err) => {
            reject(new Error('Failed to load image for resizing'));
        };

        // Set source
        if (typeof input === 'string') {
            img.src = input;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(input);
        }
    });
}

/**
 * Returns a proxied URL for images hosted on Instagram/Facebook CDN,
 * which block direct hotlinking from browser requests.
 * Pass any URL — non-CDN URLs are returned unchanged.
 */
export function proxyCdnImageUrl(url: string): string {
    if (!url) return url
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
        return `/api/proxy-image?url=${encodeURIComponent(url)}`
    }
    return url
}

