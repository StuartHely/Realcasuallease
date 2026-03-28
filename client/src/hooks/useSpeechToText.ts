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

    let silenceTimer: any;
    r.onresult = (e: any) => {
      clearTimeout(silenceTimer);
      let fullTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        fullTranscript += e.results[i][0].transcript;
      }
      onResultRef.current(fullTranscript);
      silenceTimer = setTimeout(() => r.stop(), 3000);
    };
    r.onend = () => { clearTimeout(silenceTimer); recognitionRef.current = null; setIsListening(false); };
    r.onerror = () => { clearTimeout(silenceTimer); recognitionRef.current = null; setIsListening(false); };
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }, []);

  return { isListening, isSupported: !!SpeechRecognitionCtor, toggle };
}
