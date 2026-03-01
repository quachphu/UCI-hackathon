import asyncio
import io
import logging
import os
import queue
import struct
import threading
import time
import wave
from google.cloud import speech
from dotenv import load_dotenv

load_dotenv()

# Auto-reads GOOGLE_APPLICATION_CREDENTIALS from .env
client = speech.SpeechClient()
logger = logging.getLogger(__name__)


def _detect_wav_params(audio_bytes: bytes):
    """
    Read sample rate and channel count from a WAV header.
    Returns (sample_rate, num_channels) or (None, None) if not a WAV file.
    """
    try:
        with wave.open(io.BytesIO(audio_bytes)) as wf:
            return wf.getframerate(), wf.getnchannels()
    except wave.Error:
        return None, None


def _to_mono_wav(audio_bytes: bytes) -> bytes:
    """
    Convert a stereo (or multi-channel) WAV to mono by averaging channels.
    Returns the audio_bytes unchanged if already mono or not a WAV file.
    """
    try:
        with wave.open(io.BytesIO(audio_bytes)) as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            raw_frames = wf.readframes(wf.getnframes())
    except wave.Error:
        return audio_bytes  # not a WAV, return as-is

    if n_channels == 1:
        return audio_bytes  # already mono

    # Unpack all samples (interleaved: L, R, L, R, …)
    n_samples = len(raw_frames) // sampwidth
    fmt_char = "h" if sampwidth == 2 else ("b" if sampwidth == 1 else "i")
    samples = struct.unpack(f"<{n_samples}{fmt_char}", raw_frames)

    # Average every group of n_channels samples → one mono sample
    mono_samples = [
        sum(samples[i : i + n_channels]) // n_channels
        for i in range(0, len(samples), n_channels)
    ]
    mono_frames = struct.pack(f"<{len(mono_samples)}{fmt_char}", *mono_samples)

    output = io.BytesIO()
    with wave.open(output, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(sampwidth)
        wf.setframerate(framerate)
        wf.writeframes(mono_frames)
    return output.getvalue()


# ──────────────────────────────────────────────
# Batch transcription (file upload)
# ──────────────────────────────────────────────


async def transcribe_audio(audio_bytes: bytes, sample_rate: int = None):
    """
    Transcribe a complete audio file (upload).
    Returns (transcript: str, elapsed_seconds: float).
    """
    audio_bytes = _to_mono_wav(audio_bytes)
    detected_rate, _ = _detect_wav_params(audio_bytes)

    if detected_rate:
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=sample_rate or detected_rate,
            language_code="en-US",
            enable_automatic_punctuation=True,
            model="latest_short",
        )
    else:
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.MULAW,
            sample_rate_hertz=sample_rate or 8000,
            language_code="en-US",
            enable_automatic_punctuation=True,
            model="latest_short",
        )

    audio = speech.RecognitionAudio(content=audio_bytes)
    loop = asyncio.get_event_loop()
    start = time.perf_counter()
    response = await loop.run_in_executor(
        None, lambda: client.recognize(config=config, audio=audio)
    )
    elapsed = time.perf_counter() - start
    logger.info("Google STT batch transcription took %.3f seconds", elapsed)

    transcript = " ".join(
        result.alternatives[0].transcript
        for result in response.results
        if result.alternatives
    )
    return transcript or "[no speech detected]", round(elapsed, 3)


# Streaming transcription (real-time WebSocket)


async def transcribe_stream(audio_queue: asyncio.Queue, sample_rate: int = 16000):
    """
    Real-time streaming STT.

    Caller puts raw PCM bytes into `audio_queue` (mono, LINEAR16, `sample_rate` Hz).
    Put `None` into the queue to signal end of stream.

    Yields (text: str, is_final: bool) tuples as Google STT returns results.
    - is_final=False  → interim/partial word (show live caption)
    - is_final=True   → confirmed sentence (pass to LLM)
    """
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=sample_rate,
        language_code="en-US",
        enable_automatic_punctuation=True,
        model="latest_short",
    )
    streaming_config = speech.StreamingRecognitionConfig(
        config=config,
        interim_results=True,  # get partial words while user is still speaking
    )

    # Bridge: async audio_queue → sync queue (needed by Google's blocking API)
    sync_queue: queue.Queue = queue.Queue()
    results_queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _audio_generator():
        """Sync generator that feeds audio chunks to Google STT."""
        while True:
            chunk = sync_queue.get()
            if chunk is None:
                return
            yield speech.StreamingRecognizeRequest(audio_content=chunk)

    def _run_stt():
        """Runs in a background thread — calls the blocking Google STT stream."""
        try:
            responses = client.streaming_recognize(streaming_config, _audio_generator())
            for response in responses:
                for result in response.results:
                    if result.alternatives:
                        text = result.alternatives[0].transcript
                        is_final = result.is_final
                        asyncio.run_coroutine_threadsafe(
                            results_queue.put((text, is_final)), loop
                        )
        except Exception as exc:
            logger.error("Streaming STT error: %s", exc)
        finally:
            asyncio.run_coroutine_threadsafe(results_queue.put(None), loop)

    # Start STT thread
    stt_thread = threading.Thread(target=_run_stt, daemon=True)
    stt_thread.start()

    # Forward audio from async queue → sync queue
    async def _feed_audio():
        while True:
            chunk = await audio_queue.get()
            sync_queue.put(chunk)
            if chunk is None:
                break

    asyncio.create_task(_feed_audio())

    # Yield results as they arrive
    while True:
        result = await results_queue.get()
        if result is None:
            break
        yield result


async def transcribe_stream_mulaw(audio_queue: asyncio.Queue):
    """
    Real-time streaming STT for Twilio's MULAW 8000Hz audio.

    Caller puts raw MULAW bytes into `audio_queue`.
    Put `None` into the queue to signal end of stream.

    Yields (text: str, is_final: bool) tuples as Google STT returns results.
    """
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.MULAW,
        sample_rate_hertz=8000,
        language_code="en-US",
        enable_automatic_punctuation=True,
        model="phone_call",
    )
    streaming_config = speech.StreamingRecognitionConfig(
        config=config,
        interim_results=True,
    )

    sync_queue: queue.Queue = queue.Queue()
    results_queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _audio_generator():
        while True:
            chunk = sync_queue.get()
            if chunk is None:
                return
            yield speech.StreamingRecognizeRequest(audio_content=chunk)

    def _run_stt():
        try:
            responses = client.streaming_recognize(streaming_config, _audio_generator())
            for response in responses:
                for result in response.results:
                    if result.alternatives:
                        text = result.alternatives[0].transcript
                        is_final = result.is_final
                        asyncio.run_coroutine_threadsafe(
                            results_queue.put((text, is_final)), loop
                        )
        except Exception as exc:
            logger.error("Streaming STT error: %s", exc)
        finally:
            asyncio.run_coroutine_threadsafe(results_queue.put(None), loop)

    stt_thread = threading.Thread(target=_run_stt, daemon=True)
    stt_thread.start()

    async def _feed_audio():
        while True:
            chunk = await audio_queue.get()
            sync_queue.put(chunk)
            if chunk is None:
                break

    asyncio.create_task(_feed_audio())

    while True:
        result = await results_queue.get()
        if result is None:
            break
        yield result
