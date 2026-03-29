import { useState, useCallback, useRef } from 'react';

const SpeechRecognitionCtor = typeof window !== 'undefined' 
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
  : null;

export function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }
    if (!SpeechRecognitionCtor) return;
    const r = new SpeechRecognitionCtor();
    r.lang = 'en-AU';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    let finalTranscript = '';

    r.onaudiostart = () => {
      setIsListening(true);
    };
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      onResultRef.current(finalTranscript || interim);
    };
    r.onend = () => { recognitionRef.current = null; setIsListening(false); };
    r.onerror = (e: any) => { recognitionRef.current = null; setIsListening(false); };
    recognitionRef.current = r;
    r.start();
  }, []);

  return { isListening, isSupported: !!SpeechRecognitionCtor, toggle };
}
