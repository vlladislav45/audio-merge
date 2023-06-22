import {Clip} from "./model/media";
import {Helpers} from "./utils/helpers";
import {AudioService} from "./service/audio.service";
import {VideoService} from "./service/video.service";
import {exec} from "child_process";

const input: Clip[] = [
    {
        "id": "e3cSHOJix9c3tIsvPUWq0",
        "projectFileId": 1,
        "src": "assets/short.mp3",
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
        "id": "e3cSHOJix9c3tIsvPUWq2",
        "projectFileId": 1,
        "src": "assets/sample-video.mp4",
        "group": 1,
        "content": {},
        "_type": "video",
        "duration": 2540,
        "originalFileDuration": 2540,
        "start": 0,
        "end": 7000,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    },
    {
        "id": "Fhsc5nvQOmYLmLz0QAkAd",
        "projectFileId": 2,
        "src": "assets/dark-engine.mp3",
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
        "src": "assets/sample-6s.mp3",
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
        "src": "assets/dark-engine.mp3",
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
];

const audioClips: Clip[] = [];
const videoClips: Clip[] = [];

input.forEach((clip) => {
    const pathLength = clip.src.split(/\/+/).length;

   const extension = Helpers.getFileExtension(clip.src.split(/\/+/)[pathLength - 1]);

   if(Helpers.isVideoFile(extension)) {
       videoClips.push(clip);
   } else if(Helpers.isAudioFile(extension)) {
       audioClips.push(clip);
   } else {
       console.log('Unsupported type');
   }
});

if(audioClips?.length && videoClips?.length) {
    // Instantiate AudioService
    const audioService = new AudioService(audioClips);
    // Instantiate VideoService
    const videoService = new VideoService(videoClips);

    audioService.applyTrims(audioService.groups);
    audioService.setDelays(audioService.groups);

    const convertMergedAudiosToString = () =>
        audioService.mergedAudios()
            .map((a) => a.mergedAudio)
            .join(';\n')
            .trim()
            .toString();
    const mergeOutputs = audioService.outputs.join('').trim().concat(`amix=inputs=${audioService.amixInputs()+1}`);

    // Combine video, background audio, and speech
    const combinedCommand = `
      ffmpeg -y -i ${videoService.inputs(videoService._input)} -i ${audioService.inputs(audioService._input)} \
        -filter_complex  \
        "\
        ${videoService.compileFilters()}
        ${audioService.compileFilters()}
        ${audioService.mergedAudios().length ? convertMergedAudiosToString() + ';\n' : ''}
        ${mergeOutputs} [merged-audios]" \
        -map ${videoService.videoOutputMap} -map [merged-audios] \
        out/output.mp4
    `;

    exec(combinedCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
} else if(audioClips?.length) {
    // Instantiate AudioService
    const audioService = new AudioService(audioClips);

    // Generate audio merging command
    const audioCommand = audioService.prepareCliCommand('out/background_audio');
    console.log('audioCommand', audioCommand);

    // Execute audio merging command
    exec(audioCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
} else if(videoClips?.length) {
    // Instantiate VideoService
    const videoService = new VideoService(videoClips);
    // Generate video conversion command
    const videoCommand = videoService.prepareCliCommand('out/intermediate_video');
    console.log('videoCommand', videoCommand);

    // Execute video conversion command
    exec(videoCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
} else {
    console.log('No input');
}