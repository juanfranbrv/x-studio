export function getOpenAIImageSizeForAspectRatio(aspectRatio?: string): string {
    const normalized = String(aspectRatio || '').trim()
    switch (normalized) {
        case '1:1':
            return '1024x1024'
        case '9:16':
            return '1024x1792'
        case '16:9':
            return '1792x1024'
        case '4:5':
            return '1024x1280'
        case '3:4':
            return '1024x1360'
        case '4:3':
            return '1360x1024'
        case '1.91:1':
            return '1952x1024'
        case '2:1':
            return '2048x1024'
        case '4:1':
            return '3072x768'
        default:
            return '1024x1024'
    }
}
