export interface Clip {
    /* this key allows to make a copy of the same file with different id */
    id: string;
    /* actual ID saved in BE for this file. */
    projectFileId: number; //
    src: string;
    group: number;
    //content can be string or html code, vis-timeline does not allow me to set type HTMLElement
    content: any;
    _type: string;
    duration: number;
    originalFileDuration: number;
    start: number;
    end: number;
    playFrom: number;
    volume: number;
    className: string;
    denyMoving: boolean;
}

// This is the same as the timeline Clip but with added properties. We use the added properties later to easily generate an FFMPEG CLI command.
export interface EnrichedClip {
    /* this key allows to make a copy of the same file with different id */
    id: string;
    /* actual ID saved in BE for this file. */
    projectFileId: number; //
    src: string;
    group: number;
    //content can be string or html code, vis-timeline does not allow me to set type HTMLElement
    content: any;
    _type: string;
    duration: number;
    originalFileDuration: number;
    start: number;
    end: number;
    playFrom: number;
    volume: number;
    className: string;
    denyMoving: boolean;

    // All modified props
    // The sequence of the original array regardless of the group managing after that
    index: number;
    mergedAudio?: string;
    mergedAudioTrackName?: string;
    merged?: boolean;
    delay?: string;
    trim?: string;
}
