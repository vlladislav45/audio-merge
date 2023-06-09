// const ffmpeg = require('./ffmpeg');
const exec = require('child_process').exec;
const path = require("path");

const input = [
    {
        "id": "e3cSHOJix9c3tIsvPUWq0",
        "projectFileId": 1,
        "src": "./short.mp3",
        "group": 1,
        "content": {},
        "_type": "audio",
        "duration": 2540,
        "originalFileDuration": 2540,
        "start": 210,
        "end": 2750,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    },
    {
        "id": "Fhsc5nvQOmYLmLz0QAkAd",
        "projectFileId": 2,
        "src": "./dark-engine.mp3",
        "group": 2,
        "content": {},
        "_type": "audio",
        "duration": 4932,
        "originalFileDuration": 12000,
        "start": 2026,
        "end": 6958,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    },
    {
        "id": "OWI2ppCEY5tUfMmUuv_nu",
        "projectFileId": 3,
        "src": "./sample-6s.mp3",
        "group": 2,
        "content": {},
        "_type": "audio",
        "duration": 6000,
        "originalFileDuration": 6000,
        "start": 8288,
        "end": 14288,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    },
    {
        "id": "W8Av4eDxQqRdb1yrW2u2G",
        "projectFileId": 2,
        "src": "./dark-engine.mp3",
        "group": 1,
        "content": {},
        "_type": "audio",
        "duration": 7068,
        "originalFileDuration": 12000,
        "start": 17370,
        "end": 24438,
        "playFrom": 4932,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    }
]

console.log('Starting converting...');

// INPUT 2
const groups = new Map();

console.log('input', input)

// Predefine all groups
input.forEach((i, index) => {
    const { group } = i;

    const element = {...i, index};
    if (groups.get(group)) {
        groups.set(group, [...groups.get(group), element]);
    } else groups.set(group, [element]);
});

console.log('groups', groups);

const src = input.map((i) => i.src).join(' -i ').trim().toString();

const outputName = (index, name) => `output--${index}-${path.basename(name)}`;

const trims = () => {
    groups.forEach((val, key) => {
        const groupId = key;

        const needsTrimArr = Array.from(val).map((i) => {
            if(i.duration === i.originalFileDuration) return undefined;

            return {
                ...i,
                trim: `atrim=start='${i.playFrom / 1000}':end='${(i.playFrom + i.duration) / 1000}'`,
            }
        }).filter((el) => el !== undefined);

        // Description: If there are needs more than 1 item to trim an audio
        // Do not need to go through this functionality if items are less or equals to 1
        if(needsTrimArr.length > 1) {
            let concatAudio = '';

            needsTrimArr.forEach((el) => {
                concatAudio += '[' + outputName(el.index, el.src) + ']';
                el.merged = true;
            })

            const mergedTrack = 'merged-audio-track' + outputName(needsTrimArr[needsTrimArr.length - 1].index, needsTrimArr[needsTrimArr.length - 1].src);
            concatAudio += 'concat=n=' + needsTrimArr.length + ':v=0:a=1' + ' [' + mergedTrack + ']';

            // add to the last element mapped values
            needsTrimArr[needsTrimArr.length - 1].mergedAudio = concatAudio;
            needsTrimArr[needsTrimArr.length - 1].mergedAudioTrackName = mergedTrack;
        }

        // Re-assign the new value with the old one
        if(!needsTrimArr.length)  groups.set(groupId,val);
        else {
            needsTrimArr.forEach((n) => {
                const ref = groups.get(n.group);
                const seekedIndex = ref.findIndex((e) => e.id === n.id);
                ref[seekedIndex] = n;
            })
        }
    })

    return groups
};

console.log('TRIMS', trims());

/**
 * If the group audio files ain't merged the delay should be from the starting point NOT from the previous stop
 * So careful with that and know that
 */
const delays = () => {
    groups.forEach((val, key) => {
        // Sort elements by start time
        const sorted = Array.from(val).sort((a, b) => {
            if(a.start < b.start) return -1;
            if(a.start > b.start) return 1;
            return 0;
        });

        sorted.forEach((s, index) => {
            let previousEl = sorted[index - 1];
            if(index === 0 || !previousEl?.merged) {
                groups.get(s.group)[index].delay = `adelay=${s.start}|${s.start}`
            } else {
                const delay = s.start - sorted[index - 1].end;
                groups.get(s.group)[index].delay = `adelay=${delay}|${delay}`
            }
        })
    });
}

delays();

const mergedLengthFilesByGroup = (group, src) => {
    let counter = 0;
    groups.get(group).filter((g) => {
        if(g.src === src && g.merged) counter++;
    })
    return counter;
}

const extractOutput = (inp) => {
    let output = '';
    if(!inp.mergedAudioTrackName && mergedLengthFilesByGroup(inp.group, inp.src) <= 1) {
        output = `[${outputName(inp.index, inp.src)}]`;
        return output;
    }

    if(inp.mergedAudioTrackName && mergedLengthFilesByGroup(inp.group, inp.src) > 1) {
        output = `[${inp.mergedAudioTrackName}]`;
        return output
    }

    return output;
}

console.log('Extract file name: ', path.basename(input[0].src))
const outputs = []
const filters = (input) => {
    let convertedString = '';
    groups.forEach((val, key) => {
        const toString = Array.from(val).map((inp, index) => {
            const originalName = `[${outputName(inp.index, inp.src)}]`;

            const output = extractOutput(inp);
            if(output) outputs.push(output);

            // output converting
            return `[${inp.index}] ${inp.trim ? inp.trim +  ',' : ''} ${inp.delay} ${originalName};`;
        }).join('\n').trim().toString();

        convertedString = convertedString + toString;
    });

    return convertedString + '\n';
}

filters(input);

const amixInputs = () => {
    // counter sum all files that are going to be merged into one separately
    let counter = 0;
    groups.forEach((val) => {
        Array.from(val).forEach((inp) => {
            if(inp.merged) counter++;
        });
    });

    // the amix sum can be calculating when the input files we remove the merged files + 1
    if(counter) return input.length - counter + 1
    // if there is no merged files just return the input
    return input.length
}

const mergedAudios = () => {
    let mergedAudios = [];
    groups.forEach((val, key) => {
        const m = Array.from(val).map((inp) => {
            if(inp.mergedAudio && mergedLengthFilesByGroup(inp.group, inp.src) > 1) return inp;

            return undefined;
        }).filter((el) => el !== undefined);

        mergedAudios = [...mergedAudios, ...m];
    });

    return mergedAudios;
}

const convertMergedAudiosToString = () => mergedAudios().map((a) => a.mergedAudio).join(';\n').trim().toString();

const mergeOutputs = outputs.join('').trim().concat(`amix=inputs=${amixInputs()}`);

console.log('merged outputs ', mergeOutputs)

const args = (outputFilename) => `
ffmpeg -i ${src} \
      -filter_complex \
      "\
      ${filters(input)}
      ${mergedAudios().length ? convertMergedAudiosToString() + ';\n' : ''}
      ${mergeOutputs} [merged-audios]" \
      -map [merged-audios] \
      ${outputFilename}.mp3
   `;

console.log('args ========> ', args('merged1'));

exec(args('merged1'), (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
});

console.log('End processing!')

const args2 = (outputFilename) => `
    ffmpeg -i ./short.mp3 -i ./short.mp3 -i ./dark-engine.mp3 -i ./dark-engine.mp3 \
       -filter_complex \
             "\
    [0:a]adelay=7015|7015 [audio-11];\
    [1:a]adelay=1000|1000, atrim=start='0':end='2.969' [audio-12];\
    [2:a]atrim=start='0':end='3.969', adelay=381|381, volume=1.5 [audio-1];\
    [3:a]atrim=start='3.588':end='14.541', adelay=2160|2160 [audio-2];\
    [audio-11][audio-1][audio-2] concat=n=3:v=0:a=1 [merged-audios-track-2]; \
    [audio-12][merged-audios-track-2]amix=inputs=2 [merged-audios]" \
    -map [merged-audios] \
     ${outputFilename}.mp3
`;

console.log('Manual args ========> ', args2('merged2'));

exec(args2('merged2'), (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
});

console.log('End processing!')