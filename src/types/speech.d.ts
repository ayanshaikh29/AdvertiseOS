/** Minimal Web Speech API types (not in the TS DOM lib). */

declare global {
  interface SpeechRecognitionAlternativeLike {
    transcript: string;
  }
  interface SpeechRecognitionResultLike {
    0?: SpeechRecognitionAlternativeLike;
  }
  interface SpeechRecognitionEventLike {
    results: ArrayLike<SpeechRecognitionResultLike>;
  }
  interface SpeechRecognitionLike {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((e: SpeechRecognitionEventLike) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export {};
