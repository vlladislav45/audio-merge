import {BaseMediaService} from "./base.media.service";
import {Clip, EnrichedClip} from "../model/media";
import _ from "lodash";

export class VideoService extends BaseMediaService {
    readonly _input: Clip[] = [];
    private groups: Map<string, EnrichedClip[]> = new Map();

    videoOutputMap: string = '';

    constructor(input: Clip[]) {
        super();
        this._input = _.orderBy(input, 'start'); // Sort clips by start time

        /**
         * Description: Groups predefine
         * Convert the input args in map filtered by groups
         * key -> track (group)
         * value -> an array of passed clips
         */
        this._input.forEach((clip, index) => {
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
    prepareCliCommand(outputName: string): string  {
        const filters: string = this.compileFilters();

        // Build arguments
        const args = (outputFilename) => `
          ffmpeg -y -i ${this.inputs(this._input)} \
            -filter_complex \
            "\
            ${filters}" \
            -map ${this.videoOutputMap} \
            ${outputFilename}.mp4
       `;

        return args(outputName);
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