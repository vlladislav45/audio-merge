import {Clip} from "./model/media";
import {Helpers} from "./utils/helpers";
import {AudioService} from "./service/audio.service";
import {VideoService} from "./service/video.service";
import {exec} from "child_process";

const input: Clip[] = [
    {
        "id": "e3cSHOJix9c3tIsvPUWq2",
        "projectFileId": '1',
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
        "projectFileId": '2',
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
        "id": "e3cSHOJix9c3tIsvPUWq0",
        "projectFileId": '1',
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
        "id": "OWI2ppCEY5tUfMmUuv_nu",
        "projectFileId": '3',
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
    // {
    //     "id": "W8Av4eDxQqRdb1yrW2u2G",
    //     "projectFileId": 'adsf',
    //     "src": "assets/dark-engine.mp3",
    //     "group": 1,
    //     "content": {},
    //     "_type": "audio",
    //     "duration": 7068,
    //     "originalFileDuration": 12000,
    //     "start": 17370,
    //     "end": 24438,
    //     "playFrom": 4932,
    //     "volume": 100,
    //     "className": "cardInfo.audioInfo.type",
    //     "denyMoving": false
    // },
    // {
    //     "id": "lWNRG71ZpngxDTV9O8HiP",
    //     "projectFileId": "0bf505af-564c-4030-b6f9-39942c0843c3",
    //     "src": "assets/0bf505af-564c-4030-b6f9-39942c0843c3.mp4",
    //     "group": 0,
    //     "content": {},
    //     "_type": "video",
    //     "duration": 23023,
    //     "originalFileDuration": 23023,
    //     "start": 0,
    //     "end": 23023,
    //     "playFrom": 0,
    //     "volume": 100,
    //     "className": "video",
    //     "denyMoving": false
    // },
    // {
    //     "id": "N2DgXcHHZS7X03xKPu9gC",
    //     "projectFileId": "68b68886-e2e4-4a28-80aa-9aadf0a72317",
    //     "src": "assets/68b68886-e2e4-4a28-80aa-9aadf0a72317.mp3",
    //     "group": 1,
    //     "content": {},
    //     "_type": "audio",
    //     "duration": 3602,
    //     "originalFileDuration": 12768,
    //     "start": 2495,
    //     "end": 6097,
    //     "playFrom": 0,
    //     "volume": 100,
    //     "className": "audio",
    //     "denyMoving": false
    // }
];

const audioClips: Clip[] = [];
const videoClips: Clip[] = [];

input.forEach((clip) => {
    const pathLength = clip.src.split(/\/+/).length;

    const extension = Helpers.getFileExtension(clip.src.split(/\/+/)[pathLength - 1]);

    if (Helpers.isVideoFile(extension)) {
        videoClips.push(clip);
    } else if (Helpers.isAudioFile(extension) && clip?.volume > 0) {
        audioClips.push(clip);
    } else {
        console.log('Unsupported type');
    }
});

/**
 * When using audio and video at the same time, it will be done sequentially
*/
if (audioClips?.length && videoClips?.length) {
    // Instantiate AudioService
    const audioService = new AudioService(audioClips);
    const audioCommand = audioService.prepareCliCommand('out/background_audio');
    exec(audioCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });

    // Add to the video clips the merged audios
    const audClips: Clip[] = [{
        "id": "OWI2ppCEY5tUfMmUuv_nu",
        "projectFileId": '3',
        "src": "assets/background_audio.mp3",
        "group": 2,
        "content": {},
        "_type": "audio",
        "duration": 6000,
        "originalFileDuration": 6000,
        "start": 0,
        "end": 0,
        "playFrom": 0,
        "volume": 100,
        "className": "cardInfo.audioInfo.type",
        "denyMoving": false
    }];

    // Instantiate VideoService
    const videoService = new VideoService(videoClips, audClips);
    // Generate video conversion command
    const videoCommand = videoService.prepareCliCommand('out/output', true);

    exec(videoCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
} else if (audioClips?.length) {
    // Instantiate AudioService
    const audioService = new AudioService(audioClips);

    // Generate audio merging command
    const audioCommand = audioService.prepareCliCommand('out/background_audio');

    console.log('audioCOmmand', audioCommand)

    // Execute audio merging command
    exec(audioCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
} else if (videoClips?.length) {
    // Instantiate VideoService
    const videoService = new VideoService(videoClips);
    // Generate video conversion command
    const videoCommand = videoService.prepareCliCommand('out/intermediate_video', false);

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