
export class Helpers {
    public static isVideoFile(extension: string): boolean {
        const videoExtensions = ['mp4', 'avi', 'webm', 'mkv', 'flv', 'vob', 'ogv']; // Standard video extensions
        return videoExtensions.includes(extension.toLowerCase());
    }

    public static isAudioFile(extension: string): boolean {
        const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'wma', 'aac', 'aa']; // Standard audio extensions
        return audioExtensions.includes(extension.toLowerCase());
    }

    /**
     * Usage example:
     *   const filename = 'example.mp4';
     *   const extension = getFileExtension(filename);
     *
     *   if (isVideoFile(extension)) {
     *   console.log('The file is a video file.');
     * } else if (isAudioFile(extension)) {
     *   console.log('The file is an audio file.');
     * } else {
     *   console.log('The file is neither a video nor an audio file.');
     * }
     */
    public static getFileExtension(filename: string): string {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            return filename.substring(lastDotIndex + 1);
        }
        return '';
    }
}