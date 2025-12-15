// components/FloatingAIAgent.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function FloatingAIAgent() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speechEnabled, setSpeechEnabled] = useState(true);
    const chatRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'hi-IN'; // Default to Hindi

                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInputValue((prev) => prev + ' ' + transcript);
                    setIsListening(false);
                };

                recognition.onerror = () => setIsListening(false);
                recognition.onend = () => setIsListening(false);

                recognitionRef.current = recognition;
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    // Toggle voice input
    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition not supported');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    // Text to speech
    const speakText = (text: string) => {
        if (!speechEnabled || typeof window === 'undefined') return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const hasHindi = /[\u0900-\u097F]/.test(text);
        utterance.lang = hasHindi ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    // Handle message send with streaming
    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: inputValue.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages }),
            });

            if (!res.ok) {
                // Try to get the error message from the API
                let errorMessage = 'API request failed';
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    // JSON parse failed, use default message
                }
                console.error('[Chat] API error:', errorMessage);
                throw new Error(errorMessage);
            }

            if (!res.body) {
                throw new Error('No response body');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';

            // Add empty assistant message
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                aiResponse += chunk;

                // Update the last message with streamed content
                setMessages((prev) => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { role: 'assistant', content: aiResponse };
                    return newMsgs;
                });
            }

            // Speak the response
            if (speechEnabled && aiResponse) {
                speakText(aiResponse.substring(0, 500));
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'माफ करें, कुछ समस्या हुई। कृपया दोबारा कोशिश करें। 🙏' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floater Button */}
            <button
                id="ai-floater"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-700 rounded-full shadow-2xl flex items-center justify-center text-white hover:from-green-700 hover:to-emerald-800 transition-all z-50 group animate-bounce hover:animate-none"
                aria-label="Open Kisaan Mitra AI Assistant"
            >
                <Sparkles className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                    AI
                </span>
            </button>

            {/* Backdrop overlay - click to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Chat Widget */}
            {isOpen && (
                <div
                    ref={chatRef}
                    className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] md:w-[420px] h-[70vh] md:h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-green-200 overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 text-white p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">किसान मित्र AI</h3>
                                <p className="text-xs text-green-100">Multilingual Expert</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSpeechEnabled(!speechEnabled)}
                                className="p-2 hover:bg-white/20 rounded-full transition"
                                title={speechEnabled ? 'Disable voice' : 'Enable voice'}
                            >
                                {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-green-50/50 to-white">
                        {messages.length === 0 && (
                            <div className="text-center mt-8 px-4">
                                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                    <Bot className="h-8 w-8 text-green-600" />
                                </div>
                                <p className="text-gray-600 font-medium">नमस्ते! मैं किसान मित्र हूं 🌾</p>
                                <p className="text-gray-500 text-sm mt-2">
                                    किसी भी भाषा में पूछें - I support all Indian languages!
                                </p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-br-md'
                                        : 'bg-white border border-gray-200 shadow-sm rounded-bl-md'
                                        }`}
                                >
                                    {msg.content || (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-pulse">●</span>
                                            <span className="animate-pulse delay-100">●</span>
                                            <span className="animate-pulse delay-200">●</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                            <div className="flex justify-start">
                                <div className="bg-white border px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                                    <span className="flex items-center gap-2 text-gray-500">
                                        <span className="animate-pulse">●</span>
                                        <span className="animate-pulse delay-100">●</span>
                                        <span className="animate-pulse delay-200">●</span>
                                        <span className="ml-1 text-sm">सोच रहा हूं...</span>
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t bg-white">
                        <div className="flex gap-2">
                            <button
                                onClick={toggleListening}
                                disabled={isLoading}
                                className={`p-3 rounded-full transition ${isListening
                                    ? 'bg-red-100 text-red-600 animate-pulse'
                                    : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'
                                    }`}
                                title={isListening ? 'Stop listening' : 'Voice input'}
                            >
                                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="अपना सवाल पूछें / Ask anything..."
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={isLoading || !inputValue.trim()}
                                className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:from-green-700 hover:to-emerald-800 disabled:opacity-50 transition shadow-md"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        {isListening && (
                            <p className="text-center text-xs text-red-500 mt-2 animate-pulse">
                                🎤 सुन रहा हूं... बोलिए!
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
