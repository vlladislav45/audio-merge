const ffmpeg = require('./ffmpeg');
const exec = require('child_process').exec;
const path = require("path");

// const input1 = [
//     {
//         "id": "4wfHRus09FTNf0ZchquMC",
//         "projectFileId": 3,
//         "src": "./sample-6s.mp3",
//         "group": 1,
//         "content": {},
//         "_type": "audio",
//         "duration": 6000,
//         "originalFileDuration": 6000,
//         "start": 0,
//         "end": 6000,
//         "playFrom": 0,
//         "volume": 100,
//         "className": "cardInfo.audioInfo.type",
//         "denyMoving": false
//     },
//     {
//         "id": "kQpxwMsCRTsUB85U_8zKt",
//         "projectFileId": 4,
//         "src": "./short.mp3",
//         "group": 2,
//         "content": {},
//         "_type": "audio",
//         "duration": 2540,
//         "originalFileDuration": 2540,
//         "start": 1833,
//         "end": 4373,
//         "playFrom": 0,
//         "volume": 100,
//         "className": "cardInfo.audioInfo.type",
//         "denyMoving": false
//     }
// ];

const input1 = [
    {
        "id": "9eD4YaVbAbgg-MhpOkvwr",
        "projectFileId": 1,
        "src": "./short.mp3",
        "group": 2,
        "content": {},
        "_type": "audio",
        "duration": 2540,
        "originalFileDuration": 2540,
        "start": 8531,
        "end": 11071,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    },
    {
        "id": "5CdsH9s5UqNR6XQfEJiR2",
        "projectFileId": 2,
        "src": "./dark-engine.mp3",
        "group": 1,
        "content": {},
        "_type": "audio",
        "duration": 3588,
        "originalFileDuration": 12000,
        "start": 381,
        "end": 3969,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    },
    {
        "id": "Oq3pmuGbamGMtbMMiDe4y",
        "projectFileId": 2,
        "src": "./dark-engine.mp3",
        "group": 1,
        "content": {},
        "_type": "audio",
        "duration": 8412,
        "originalFileDuration": 12000,
        "start": 6129,
        "end": 14541,
        "playFrom": 3588,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    }
]

const input = [
    {
        "id": "tOVI6W9uQBEolJKIidiQX",
        "projectFileId": 1,
        "src": "./short.mp3",
        "group": 1,
        "content": {},
        "_type": "audio",
        "duration": 2540,
        "originalFileDuration": 2540,
        "start": 0,
        "end": 2540,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    }
]

// ffmpeg()
//     .input('sample-3s.mp3')
//     .save('voice-message.wav');

console.log('Starting converting...');

// INPUT 1

// const src = input1.map((i) => i.src).join(' -i ').trim().toString();
//
// exec(`ffmpeg -i ${src} \
//       -filter_complex \
//       "\
//       [0]adelay=0|0[output-s3];\
//       [1]adelay=${input1[1].start}|${input1[1].start}[output-6s];\
//       [output-s3][output-6s]amix=2" \
//       merged.mp3
//    `, (err, stdout, stderr) => {
//     if (err) {
//         console.error(err);
//         return;
//     }
//     console.log(stdout);
// });

console.log('End processing!')

console.log('Starting converting...');

// INPUT 2
const groups = new Map();

// Predefine all groups
input.forEach((i, index) => {
    const { group } = i;

    const element = {...i, index};
    if (groups.get(group)) {
        groups.set(group, [...groups.get(group), element]);
    } else groups.set(group, [element]);
});

const src = input.map((i) => i.src).join(' -i ').trim().toString();

const delays2 = () => {
    groups.forEach((val, key) => {
        // Sort elements by start time
       const sorted = Array.from(val).sort((a, b) => {
           if(a.start < b.start) return -1;
           if(a.start > b.start) return 1;
           return 0;
       });

       // Maybe compare left with right
       sorted.forEach((s, index) => {
           if(index === 0) {
               groups.get(s.group)[index].delay = `adelay=${s.start}|${s.start}`
           } else {
               const delay = s.start - sorted[index - 1].end;
               console.log('start', s.start);
               console.log(' sorted[index - 1].end',  sorted[index - 1].end);
               console.log('delay', delay)
               groups.get(s.group)[index].delay = `adelay=${delay}|${delay}`
           }
       })
    });
}

delays2();

const outputName = (index, name) => `output--${index}-${path.basename(name)}`;

const trims = () => {
    groups.forEach((val, key) => {
        const groupId = key;

        const needsTrimArr = Array.from(val).map((i) => {
            if(i.duration === i.originalFileDuration) return undefined;

            return {
                ...i,
                trim: `atrim=start='${i.playFrom / 1000}':end='${i.end / 1000}'`,
            }
        }).filter((el) => el !== undefined);

        // If there are needs for trim add to the last element mapped values
        if(needsTrimArr.length) {
            let concatAudio = '';


            needsTrimArr.forEach((el) => {
                concatAudio += '[' + outputName(el.index, el.src) + ']';
                el.merged = true;
            })

            const mergedTrack = 'merged-audio-track' + outputName(needsTrimArr[needsTrimArr.length - 1].index, needsTrimArr[needsTrimArr.length - 1].src);
            concatAudio += 'concat=n=' + needsTrimArr.length + ':v=0:a=1' + ' [' + mergedTrack + ']';

            needsTrimArr[needsTrimArr.length - 1].mergedAudio = concatAudio;
            needsTrimArr[needsTrimArr.length - 1].mergedAudioTrackName = mergedTrack;
        }

        // Re-assign the new value with the old one
        groups.set(groupId, needsTrimArr.length ? needsTrimArr : val);
    })

    return groups
};

console.log('TRIMS', trims());

console.log('Extract file name: ', path.basename(input[0].src))
const outputs = []
const filters = (input) => {
    let convertedString = '';
    groups.forEach((val, key) => {
        const toString = Array.from(val).map((inp, index) => {
            const originalName = `[${outputName(inp.index, inp.src)}]`;
            let output = '';
            if(!inp.mergedAudioTrackName && !inp.merged) {
                output = `[${outputName(inp.index, inp.src)}]`;
                outputs.push(output)
            }

            if(inp.mergedAudioTrackName && inp.merged) {
                output = `[${inp.mergedAudioTrackName}]`;
                outputs.push(output);
            }

            // output converting
            return `[${inp.index}] ${inp.trim ? inp.trim +  ',' : ''} ${inp.delay} ${originalName};`;
        }).join('\n').trim().toString();

        convertedString = convertedString + toString;
    });

    return convertedString + '\n';
}

filters(input);

const mergedAudios = () => {
    let mergedAudios = [];
    groups.forEach((val, key) => {
        const m = Array.from(val).map((inp) => {
            if(inp.mergedAudio) return inp;

            return undefined;
        }).filter((el) => el !== undefined);

        mergedAudios = [...mergedAudios, ...m];
    });

    return mergedAudios;
}

const convertMergedAudiosToString = () => mergedAudios().map((a) => a.mergedAudio).join('\n').trim().toString();

const mergeOutputs = outputs.join('').trim().concat(`amix=inputs=${input.length - mergedAudios().length}`);

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
    ffmpeg -i ./short.mp3 -i ./dark-engine.mp3 -i ./dark-engine.mp3 \
       -filter_complex \
             "\
    [0:a]adelay=7015|7015[output-short-0.mp3];\
    [1:a]atrim=start='0':end='3.969', adelay=381|381 [audio-1];\
    [2:a]atrim=start='3.588':end='14.541', adelay=2160|2160 [audio-2];\
    [audio-1][audio-2] concat=n=2:v=0:a=1 [merged-audios-track-2];
    [output-short-0.mp3][merged-audios-track-2]amix=inputs=2 [merged-audios]" \
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