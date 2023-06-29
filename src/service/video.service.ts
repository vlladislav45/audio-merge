import {BaseMediaService} from "./base.media.service";
import {Clip, EnrichedClip} from "../model/media";
import _ from "lodash";

export class VideoService extends BaseMediaService {
    readonly _videoInput: Clip[] = [];
    readonly _audioInput: Clip[] = [];
    private groups: Map<string, EnrichedClip[]> = new Map();

    videoOutputMap: string = '';

    constructor(videos: Clip[], audios?: Clip[]) {
        super();
        this._videoInput = _.orderBy(videos, 'start'); // Sort clips by start time
        this._audioInput = _.orderBy(audios, 'start'); // Sort clips by start time

        /**
         * Description: Groups predefine
         * Convert the input args in map filtered by groups
         * key -> track (group)
         * value -> an array of passed clips
         */
        this._videoInput.forEach((clip, index) => {
            const { group } = clip;

            const element = { ...clip, index };
            if (this.groups.get(String(group))) {
                this.groups.set(String(group), [...this.groups.get(String(group)), element]);
            } else this.groups.set(String(group), [element]);
        });
    }

    /**
     * The main method that preparing and compiling all side effects in arguments
     */
    prepareCliCommand(outputName: string, copyAudio?: boolean): string  {
        const filters: string = this.compileFilters();

          // Build arguments
          const  args = (outputFilename) => `
          ffmpeg -y -i ${this.inputs(this._videoInput)} -i ${this.inputs(this._audioInput)} \
            -filter_complex \
            "\
            ${filters} \
            ${copyAudio ? this.attachAudio(outputFilename) : `" \ -map ${this.videoOutputMap} ${outputFilename}.mp4 `}
          
       `;

        return args(outputName);
    }

    /**
     * Attach specific audios to the video while preparing the command
    */
    attachAudio(outputFilename: string): string {
        // If you wanna use compression add the following line after "[bg_audio][0:a]amix=inputs=2[a]"
        // -c:v libx264 -crf 23 -preset veryfast -c:a aac -b:a 128k

        const command = `;
        [1:a]adelay=0|0[bg_audio]; \
        [bg_audio][0:a]amix=inputs=2[a]" \
        -map "${this.videoOutputMap}" -map "[a]"  -shortest ${outputFilename}.mp4 `;
        return command;
    }

    /**
     * filter -complex
     * Preparing and converting the input arguments to suitable output directly in string format
     */
    compileFilters(): string {
        let convertedString = '';
        this.groups.forEach((val, key) => {
            const generateFilters = Array.from(val).map((mt, index) => {
                const outputName = `[${this.generateOutputName(mt.index, mt.src)}]`;
                this.videoOutputMap = outputName;
                // output converting
                const converted = `[${mt.index}:v] scale=-1:720 ${outputName}`;

                return converted;
            });

            const generatedFiltersToString = generateFilters.join('\n').trim().toString();
            convertedString += generatedFiltersToString;
        });

        return convertedString;
    }
}