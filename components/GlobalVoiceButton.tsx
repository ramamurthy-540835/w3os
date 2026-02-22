'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface GlobalVoiceButtonProps {
  onOpenTerminal?: () => void;
  onOpenNotepad?: () => void;
  onOpenPythonCoder?: () => void;
  onCommand?: (command: string) => void;
}

export default function GlobalVoiceButton({
  onOpenTerminal,
  onOpenNotepad,
  onOpenPythonCoder,
  onCommand,
}: GlobalVoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [browserSupport, setBrowserSupport] = useState({
    mediaRecorder: false,
    speechSynthesis: false,
    getUserMedia: false,
  });

  useEffect(() => {
    setBrowserSupport({
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      speechSynthesis: typeof speechSynthesis !== 'undefined',
      getUserMedia:
        !!navigator.mediaDevices?.getUserMedia ||
        !!(navigator as any).webkitGetUserMedia,
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (!browserSupport.speechSynthesis) return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [browserSupport.speechSynthesis]);

  const processTranscription = useCallback(async (transcript: string) => {
    const lowerText = transcript.toLowerCase();

    // Route based on voice command
    if (lowerText.includes('open terminal') || lowerText.includes('open console')) {
      onOpenTerminal?.();
      speak('Opening terminal');
    } else if (lowerText.includes('open notepad') || lowerText.includes('open notes')) {
      onOpenNotepad?.();
      speak('Opening notepad');
    } else if (lowerText.includes('code') || lowerText.includes('python') || lowerText.includes('coder')) {
      onOpenPythonCoder?.();
      speak('Opening Python coder');
    } else if (lowerText.includes('run') || lowerText.includes('execute')) {
      // Send to terminal
      onCommand?.(`execute:${transcript}`);
      speak('Executing command');
    } else {
      // Send to AI assistant
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: transcript,
            history: [],
          }),
        });

        const data = await response.json();
        if (response.ok && data.reply) {
          speak(data.reply);
          onCommand?.(`message:${data.reply}`);
        } else {
          speak('I did not understand that. Please try again.');
        }
      } catch (error) {
        speak('There was an error processing your request.');
        console.error('Voice command error:', error);
      }
    }
  }, [onOpenTerminal, onOpenNotepad, onOpenPythonCoder, onCommand, speak]);

  const startListening = useCallback(async () => {
    try {
      if (!browserSupport.mediaRecorder || !browserSupport.getUserMedia) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsProcessing(true);

        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();

          reader.onloadend = async () => {
            try {
              const audioBase64 = (reader.result as string).split(',')[1];

              // Send to voice API for transcription only
              const voiceRes = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'speech-to-text',
                  audioBase64,
                }),
              });

              const voiceData = await voiceRes.json();

              if (voiceRes.ok && voiceData.transcription) {
                await processTranscription(voiceData.transcription);
              } else {
                speak('Could not transcribe audio. Please try again.');
              }
            } catch (err: any) {
              speak('Error processing voice command');
              console.error('Voice processing error:', err);
            } finally {
              setIsProcessing(false);
            }
          };

          reader.readAsDataURL(blob);
        } catch (err: any) {
          setIsProcessing(false);
          console.error('Audio processing error:', err);
        }

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err: any) {
      console.error('Microphone access error:', err);
    }
  }, [browserSupport, processTranscription, speak]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <button
      onClick={toggleListening}
      disabled={isProcessing}
      className={`
        fixed bottom-6 right-6 w-16 h-16 rounded-full
        flex items-center justify-center text-2xl
        text-white font-bold transition-all
        shadow-lg hover:shadow-xl
        ${isListening ? 'bg-red-500 animate-pulse shadow-red-500/50' : 'bg-blue-600 hover:bg-blue-700'}
        ${isSpeaking ? 'bg-yellow-500 animate-bounce shadow-yellow-500/50' : ''}
        ${isProcessing ? 'bg-amber-500 opacity-75 cursor-not-allowed' : ''}
        z-50
      `}
      title={
        isProcessing ? 'Processing...' : isListening ? 'Click to stop listening' : 'Click to speak'
      }
    >
      {isProcessing ? '⏳' : isListening ? '⏹' : isSpeaking ? '🔊' : '🎤'}
    </button>
  );
}
