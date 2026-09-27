# Neural voiceover

The final demo uses **Kokoro v1.0, voice `af_heart`**, generated locally. It does not use a recording or clone of Shivam Gupta's voice. The video continuously labels the narration as synthetic.

The script uses shorter sentences and contractions. Speech is regenerated at speed `0.98` and placed within the original scene timings without time stretching. Boundary silence is trimmed, with five-millisecond fades to prevent edit clicks. Internal speech and pauses are preserved. The actual 126-second application recording remains unsped. Each caption contains the complete corresponding spoken sentence and uses its exact PCM start and end times. Captions occupy their own band below the product interface. A single 25 fps frame timeline drives the burned captions, with a maximum 40 ms quantization difference from the SRT. No text-length timing estimates or variable-duration image concatenation are used.

## Reproduction

Runtime: [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), version 0.6.1, with soundfile and Pillow. The runtime is MIT licensed. Kokoro model weights are Apache 2.0 licensed. Voice details are documented by [the model publisher](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).

Download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the runtime's [official model release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0) into `.artifacts/kokoro/`. These large files are local build inputs and are not committed.

Verified downloaded assets:

| Asset            |     Bytes | SHA-256                                                            |
| ---------------- | --------: | ------------------------------------------------------------------ |
| kokoro-v1.0.onnx | 325532387 | `7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5` |
| voices-v1.0.bin  |  28214398 | `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d` |

Install the Python dependencies in an isolated environment. With ffmpeg and ffprobe on PATH, run:

```sh
python scripts/render-demo.py \
  --bob-evidence submission/media/bob-verification-work.png \
  --bob-confirmed \
  --bob-narration submission/BOB-NARRATION.txt
```

`--bob-confirmed` records that the actual contribution and narration have been reviewed. The work capture does not replace the required Bob task consumption summary.

The short preview `media/neural-voice-sample.mp3` is for voice review. The submission asset is `final-demo.mp4` with the complete narration, captions and real screen recording.

## Synchronization verification

The rebuilt edit joins four independently decoded clips on normalized timestamps. This fixes the earlier clip-boundary jump. `scripts/verify-demo.py` checks all scene midpoints and both sides of each principal edit: 22 footage comparisons and 22 caption comparisons, followed by a full audio/video decode. An independent local Whisper transcription was reviewed against the narration for missing segments. The report is in `media/final-video-verification.json`.
