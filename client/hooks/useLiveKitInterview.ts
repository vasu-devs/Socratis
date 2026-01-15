import { useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Participant, Track, TrackPublication, RemoteParticipant, LocalParticipant } from 'livekit-client';

interface UseLiveKitInterviewProps {
    sessionId: string;
    participantName: string;
    onCallEnd?: () => void;
}

export function useLiveKitInterview({ sessionId, participantName, onCallEnd }: UseLiveKitInterviewProps) {
    const [room, setRoom] = useState<Room | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState<Array<{ role: 'ai' | 'user', content: string }>>([]);
    const [audioTracks, setAudioTracks] = useState(0);

    const startSession = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:4000/api/livekit/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, participantName: `${participantName}-${Math.floor(Math.random() * 1000)}` })
            });

            if (!response.ok) throw new Error('Failed to fetch LiveKit token');

            const { token, url } = await response.json();

            const newRoom = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            await newRoom.connect(url, token, {
                autoSubscribe: true,
                rtcConfig: {
                    iceTransportPolicy: 'relay',
                }
            });

            // Explicitly enable microphone to trigger browser permission request
            await newRoom.localParticipant.setMicrophoneEnabled(true);

            setRoom(newRoom);
            setIsConnected(true);

            // Handle audio playback for remote participants (the AI)
            newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === Track.Kind.Audio) {
                    track.attach();
                    setAudioTracks(prev => prev + 1);
                }
            });

            newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                if (track.kind === Track.Kind.Audio) {
                    track.detach();
                    setAudioTracks(prev => Math.max(0, prev - 1));
                }
            });

            newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
                // Check if any remote participant is speaking (assuming AI is remote)
                const isAiSpeaking = speakers.some(s => s instanceof RemoteParticipant && s.isSpeaking);
                setIsSpeaking(isAiSpeaking);
            });

            newRoom.on(RoomEvent.Disconnected, () => {
                setIsConnected(false);
                setRoom(null);
                if (onCallEnd) onCallEnd();
            });

            // LiveKit Agents typically send transcription via Data Channel or specialized events
            // For now, we'll implement a placeholder for transcription logic
            // In a real scenario, you'd listen to RoomEvent.DataReceived or similar
            newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
                try {
                    const decoder = new TextDecoder();
                    const data = JSON.parse(decoder.decode(payload));

                    if (data.type === 'transcript') {
                        setTranscript(prev => [...prev, {
                            role: data.role === 'assistant' ? 'ai' : 'user',
                            content: data.text
                        }]);

                        // Check for termination
                        if (data.role === 'user') {
                            const terminationRegex = /(I('?m| am) done|End (the )?(interview|test|call)|That'?s all|Stop the interview)/i;
                            if (terminationRegex.test(data.text)) {
                                stopSession();
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error parsing transcript data:', e);
                }
            });

        } catch (error) {
            console.error('Failed to start LiveKit session:', error);
        }
    }, [sessionId, participantName, onCallEnd]);

    const stopSession = useCallback(async () => {
        if (room) {
            await room.disconnect();
            setRoom(null);
            setIsConnected(false);
        }
    }, [room]);

    const toggleMute = useCallback(async () => {
        if (room && room.localParticipant) {
            const enabled = !isMuted;
            await room.localParticipant.setMicrophoneEnabled(!enabled);
            setIsMuted(enabled);
        }
    }, [room, isMuted]);

    const sendData = useCallback(async (data: any) => {
        if (room && room.localParticipant) {
            try {
                const strData = JSON.stringify(data);
                const encoder = new TextEncoder();
                await room.localParticipant.publishData(encoder.encode(strData), { reliable: true });
            } catch (e) {
                console.error("Failed to publish data:", e);
            }
        }
    }, [room]);

    useEffect(() => {
        return () => {
            if (room) {
                room.disconnect();
            }
        };
    }, [room]);

    return {
        isConnected,
        isSpeaking,
        isMuted,
        transcript,
        startSession,
        stopSession,
        toggleMute,
        audioTracks,
        sendData
    };
}
