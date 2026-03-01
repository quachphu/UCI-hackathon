import threading, asyncio
import assemblyai as aai
from assemblyai.streaming.v3 import (
    StreamingClient, StreamingClientOptions, StreamingParameters,
    StreamingEvents, BeginEvent, TurnEvent, TerminationEvent, StreamingError
)

TWILIO_SAMPLE_RATE = 8000  
BYTES_PER_MS = TWILIO_SAMPLE_RATE // 1000  
BUFFER_MS = 100                            
BUFFER_BYTES = BUFFER_MS * BYTES_PER_MS     

class AssemblyAIStreamerTwilio(StreamingClient):
    def __init__(self, api_key: str,model,loop):
        super().__init__(StreamingClientOptions(api_key=api_key, api_host="streaming.assemblyai.com"))

        self.model = model

        self.on(StreamingEvents.Begin, self.on_begin)
        self.on(StreamingEvents.Turn, self.on_turn)
        self.on(StreamingEvents.Termination, self.on_terminated)
        self.on(StreamingEvents.Error, self.on_error)

        self._buf = bytearray()
        self._lock = threading.Lock()
        self._loop = loop
        self._active = False

    def start(self):
        params = StreamingParameters(
            sample_rate=TWILIO_SAMPLE_RATE,              
            encoding=aai.AudioEncoding.pcm_mulaw,        
            format_turns=True,
        )
        self._active = True
        self.connect(params)

    def send_audio(self, mulaw_bytes: bytes):
        if not self._active:
            return

        with self._lock:
            self._buf.extend(mulaw_bytes)

            # flush in >=100ms chunks
            while len(self._buf) >= BUFFER_BYTES:
                chunk = bytes(self._buf[:BUFFER_BYTES])
                del self._buf[:BUFFER_BYTES]
                self.stream(chunk)  # v3: stream(bytes)

    def stop(self):
        self._active = False
        with self._lock:
            if self._buf:
                # only send remainder if it meets minimum (50ms = 400 bytes)
                if len(self._buf) >= 50 * BYTES_PER_MS:
                    self.stream(bytes(self._buf))
                self._buf.clear()
        self.disconnect(terminate=True)

    # ---- callbacks ----
    def on_begin(self, client: "StreamingClient", event: BeginEvent):
        print(f"[AssemblyAI] Session started: {event.id}")

    def on_turn(self, client: "StreamingClient", event: TurnEvent):
        if event.end_of_turn and event.turn_is_formatted:
            txt = (event.transcript or "").strip()
            if txt:
                asyncio.run_coroutine_threadsafe(
                    self._handle_turn(txt,1),self._loop
                )

    async def _handle_turn(self, txt: str, session_id: str):
        response = await self.model.get_response(user_input=txt, session_id=session_id)
        print(response)

    def on_terminated(self, client: "StreamingClient", event: TerminationEvent):
        print(f"[AssemblyAI] Session terminated ({event.audio_duration_seconds}s processed)")

    def on_error(self, client: "StreamingClient", error: StreamingError):
        print(f"[AssemblyAI] Error: {error}")