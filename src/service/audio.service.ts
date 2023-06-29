import {BaseMediaService} from "./base.media.service";
import {Clip, EnrichedClip} from "../model/media";
import _ from 'lodash';

export class AudioService extends BaseMediaService {
    readonly _input: Clip[] = [];

    private countedMergedFiles = 0;
    groups: Map<string, EnrichedClip[]> = new Map();
    outputs: string[] = [];

    public args: string;

    constructor(input: Clip[]) {
        super();
        this._input = _.orderBy(input, 'start'); // Sort clips by start time
        this.args = '';

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
     * The main method that prepares and compiles all of the side effects in the arguments
     */
    prepareCliCommand(outputName: string): string {
        this.applyTrims();
        this.setDelays();

        const filters: string = this.compileFilters();
        const mergeOutputs = this.outputs.join('').trim().concat(`amix=inputs=${this.amixInputs()}`);

        // Build arguments
        const args = (outputFilename) => `
      ffmpeg -y -i ${this.inputs(this._input)} \
        -filter_complex \
        "\
        ${filters}
        ${this.mergedAudios().length ? this.convertMergedAudiosToString() + ';\n' : ''}
        ${mergeOutputs} [merged-audios]" \
        -map [merged-audios] \
         ${outputFilename}.mp3
   `;

        return args(outputName);
    }

    private convertMergedAudiosToString() {
        return this.mergedAudios()
            .map((a) => a.mergedAudio)
            .join(';\n')
            .trim()
            .toString();
    }

    /**
     * Trimming all needed files passed by
     */
    private applyTrims(): void {
        const groups = this.groups;
        groups.forEach((val, groupId) => {
            const needsTrimArr = Array.from(val)
                .map((mt) => {
                    const { duration, originalFileDuration } = mt;

                    if (duration === originalFileDuration) return undefined;

                    return {
                        ...mt,
                        trim: `atrim=start='${mt.playFrom / 1000}':end='${(mt.playFrom + mt.duration) / 1000}'`,
                    };
                })
                .filter((el) => el !== undefined);

            // Description: If there are needs more than 1 item to trim an audio
            // Do not need to go through this functionality if items are less or equals to 1
            if (needsTrimArr.length > 1) {
                let concatAudio = '';

                needsTrimArr.forEach((el) => {
                    concatAudio += '[' + this.generateOutputName(el.index, el.src) + ']';
                    el.merged = true;
                });

                const lastGroupAudioIndex = needsTrimArr.length - 1;
                const mergedTrack =
                    'merged-audio-track' +
                    this.generateOutputName(needsTrimArr[lastGroupAudioIndex].index, needsTrimArr[lastGroupAudioIndex].src);
                concatAudio += 'concat=n=' + needsTrimArr.length + ':v=0:a=1' + ' [' + mergedTrack + ']';

                this.countedMergedFiles += 1;

                // add to the last element mapped values
                needsTrimArr[lastGroupAudioIndex].mergedAudio = concatAudio;
                needsTrimArr[lastGroupAudioIndex].mergedAudioTrackName = mergedTrack;
            }

            // Re-assign the new value with the old one
            if (!needsTrimArr.length) groups.set(groupId, val);
            else {
                // This foreach is to re-assign the value of specific clip in the array of a group
                needsTrimArr.forEach((n) => {
                    const ref = groups.get(String(n.group));
                    const seekedIndex = ref.findIndex((e) => e.id === n.id);
                    ref[seekedIndex] = n;
                });
            }
        });
    }

    /**
     * Set delays to each file
     * Hint: If the specific group audio files ain't merged
     * the delay should be from the starting point NOT from the previous stop
     */
    private setDelays(): void {
        const groups = this.groups;
        groups.forEach((val, key) => {
            // Sort clips by start time
            const sorted = _.orderBy(Array.from(val), 'start');

            sorted.forEach((mt, index) => {
                const previousEl = sorted[index - 1];
                // If the previous element isn't clipped then take for the delay is the start point
                if (index === 0 || !previousEl?.merged) {
                    groups.get(String(mt.group))[index].delay = `adelay=${mt.start}|${mt.start}`;
                } else {
                    // If the previous element it was clipped then take in mind its end point
                    const end = sorted[index - 1].end;
                    const delay = mt.start - end;
                    groups.get(String(mt.group))[index].delay = `adelay=${delay}|${delay}`;
                }
            });
        });
    }

    /**
     * Count all trimmed audio files
     * Example: The result of 1 file which has been trimmed into two parts. Those two pieces are
     * represented as result of this method
     */
    private mergedFilesLengthByGroup(group: number, src: string): number {
        let counter = 0;
        this.groups.get(String(group)).filter((g) => {
            if (g.src === src && g.merged) counter++;
        });
        return counter;
    }

    /**
     * It's about the generated output from non-merged and merged files
     * Example: [output-short-0.mp3] [merged-audios-track-2]
     */
    private generateOutput(mt: EnrichedClip): string {
        let output = '';
        if (!mt.mergedAudioTrackName && this.mergedFilesLengthByGroup(mt.group, mt.src) < 1) {
            output = `[${this.generateOutputName(mt.index, mt.src)}]`;
            return output;
        }

        if (mt.mergedAudioTrackName && this.mergedFilesLengthByGroup(mt.group, mt.src)) {
            output = `[${mt.mergedAudioTrackName}]`;
            return output;
        }

        return output;
    }

    /**
     * Compile the input volume in ready to go string
     *
     * @param volume
     * @output maxValue = 2 => 200%
     * This statement refers to a cumulative value that increases from 0 to 200,
     * with an interval of 10. It indicates a progression in which the value starts at 0
     * and gradually increases by 10 units until it reaches a maximum value of 200.
     */
    private compileVolumes(volume?: number): string {
        if (volume) {
            if (volume > 200) {
                volume = 200;
            }

            if (volume < 0) {
                volume = 0;
            }

            // ffmpeg understand the percentage increase from 0 to 1
            // here we are transpiled the input to the ffmpeg's requirements
            volume /= 100;
            return `,volume=${volume}`;
        }
        return ',volume=0';
    }

    /**
     * filter -complex
     * Preparing and converting the input arguments to suitable output directly in string format
     */
    private compileFilters(): string {
        let convertedString = '';
        this.groups.forEach((val, key) => {
            const generateFilters = Array.from(val).map((mt, index) => {
                const originalName = `[${this.generateOutputName(mt.index, mt.src)}]`;

                const output = this.generateOutput(mt);
                if (output) this.outputs.push(output);

                // output converting
                const converted = `[${mt.index}:a] ${mt.trim ? mt.trim + ',' : ''} ${mt.delay}${this.compileVolumes(
                    mt?.volume
                )} ${originalName};`;

                return converted;
            });

            const generatedFiltersToString = generateFilters.join('\n').trim().toString();
            convertedString = convertedString + generatedFiltersToString;
        });

        return convertedString + '\n';
    }

    private amixInputs(): number {
        // counter sum all files that are going to be merged into one separately
        let counter = 0;
        this.groups.forEach((val) => {
            Array.from(val).forEach((mt) => {
                if (mt.merged) counter++;
            });
        });

        // There is a scenario when all files are merged then we need to return the calculated sum of all merged files
        if (counter >= this._input.length) return this.countedMergedFiles;

        // the amix sum can be calculating when the input files we remove the merged files + 1
        if (counter) return this._input.length - counter + 1;
        // if there is no merged files just return the input
        return this._input.length;
    }

    /**
     * Method that return only a merged files
     */
    private mergedAudios(): EnrichedClip[] {
        let mergedAudios: EnrichedClip[] = [];
        this.groups.forEach((val, group: string) => {
            const m = Array.from(val)
                .map((mt) => {
                    if (mt.mergedAudio && this.mergedFilesLengthByGroup(mt.group, mt.src)) return mt;

                    return undefined;
                })
                .filter((el) => el !== undefined);

            mergedAudios = [...mergedAudios, ...m];
        });

        return mergedAudios;
    }
}
