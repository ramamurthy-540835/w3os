'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceAssistantProps {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
  conversationHistory?: Array<{ role: string; content: string }>;
  autoSpeak?: boolean;
  className?: string;
}

export default function VoiceAssistant({
  onTranscript,
  onResponse,
  onError,
  conversationHistory = [],
  autoSpeak = true,
  className = '',
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check browser support
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

  const startListening = useCallback(async () => {
    try {
      if (!browserSupport.mediaRecorder || !browserSupport.getUserMedia) {
        const error =
          'Your browser does not support voice recording. Please use Chrome, Edge, or Firefox.';
        onError?.(error);
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

              // Send to voice API for speech-to-text with response
              const voiceRes = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'speech-to-text-with-response',
                  audioBase64,
                  history: conversationHistory,
                }),
              });

              const voiceData = await voiceRes.json();

              if (!voiceRes.ok) {
                throw new Error(voiceData.error || 'Voice processing failed');
              }

              const { transcription: transcript, reply } = voiceData;

              // Update UI
              setTranscription(transcript);
              onTranscript?.(transcript);
              onResponse?.(reply);

              // Speak the response
              if (autoSpeak && browserSupport.speechSynthesis) {
                speak(reply);
              }
            } catch (err: any) {
              const errorMsg =
                err.message || 'Failed to process voice command';
              onError?.(errorMsg);
              console.error('Voice processing error:', err);
            } finally {
              setIsProcessing(false);
            }
          };

          reader.readAsDataURL(blob);
        } catch (err: any) {
          const errorMsg = err.message || 'Failed to process audio';
          onError?.(errorMsg);
          console.error('Audio processing error:', err);
          setIsProcessing(false);
        }

        // Stop stream tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.onerror = (e) => {
        const errorMsg = `Recording error: ${(e as any).error || 'Unknown'}`;
        onError?.(errorMsg);
        setIsListening(false);
      };

      mediaRecorder.start();
      setIsListening(true);
      setTranscription('');
    } catch (err: any) {
      const errorMsg =
        err.message === 'Permission denied'
          ? 'Microphone access denied. Please check your browser permissions.'
          : `Microphone error: ${err.message}`;
      onError?.(errorMsg);
      console.error('Microphone access error:', err);
    }
  }, [
    onTranscript,
    onResponse,
    onError,
    conversationHistory,
    autoSpeak,
    browserSupport,
  ]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const speak = (text: string) => {
    if (!browserSupport.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel previous speech if any
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getStatus = () => {
    if (isProcessing) return 'Processing...';
    if (isListening) return 'Listening...';
    if (isSpeaking) return 'Speaking...';
    return 'Click to speak';
  };

  const getStatusColor = () => {
    if (isProcessing) return 'bg-amber-500';
    if (isListening) return 'bg-red-500';
    if (isSpeaking) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center
          text-2xl font-bold text-white transition-all
          ${getStatusColor()}
          hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
          ${isListening ? 'animate-pulse shadow-lg shadow-red-500/50' : ''}
          ${isSpeaking ? 'animate-bounce shadow-lg shadow-yellow-500/50' : ''}
          shadow-md hover:shadow-lg
        `}
        title={getStatus()}
      >
        {isProcessing ? '⏳' : isListening ? '⏹' : isSpeaking ? '🔊' : '🎤'}
      </button>

      <div className="text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {getStatus()}
        </p>

        {transcription && (
          <div className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg max-w-xs">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              You said:
            </p>
            <p className="text-sm text-zinc-900 dark:text-zinc-50 italic">
              "{transcription}"
            </p>
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
        {!browserSupport.mediaRecorder ||
        !browserSupport.getUserMedia ||
        !browserSupport.speechSynthesis ? (
          <p className="text-red-600 dark:text-red-400">
            ⚠️ Voice features not supported in your browser. Please use Chrome,
            Edge, or Firefox.
          </p>
        ) : (
          <p>Press to record voice commands. AI will respond with voice.</p>
        )}
      </div>
    </div>
  );
}
