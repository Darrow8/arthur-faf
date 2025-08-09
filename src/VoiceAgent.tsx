import { OPENAI_API_KEY } from '@env';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Platform, StyleSheet, Text, View, PermissionsAndroid } from 'react-native';
import * as RNWebRTC from 'react-native-webrtc';
// Fallback destructuring at runtime to avoid crash if native module isn't linked yet
const mediaDevices = (RNWebRTC as any)?.mediaDevices;
const RTCPeerConnection = (RNWebRTC as any)?.RTCPeerConnection;
const RTCSessionDescription = (RNWebRTC as any)?.RTCSessionDescription;
type MediaStream = any;

export default function VoiceAgent() {
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const pcRef = useRef<any | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const rtcConfig = useMemo(() => ({
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
    ],
  }), []);

  useEffect(() => {
    setIsReady(true);
    return () => {
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t: any) => t.stop());
      }
    };
  }, []);

  const ensureLocalStream = async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Microphone permission denied');
      }
    }
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  };

  const connect = async () => {
    if (isConnected) return;
    setIsTalking(true);
    try {
      if (!RTCPeerConnection || !mediaDevices || !RTCSessionDescription) {
        throw new Error('react-native-webrtc is not linked. Run `cd ios && pod install`, rebuild the app, and try again.');
      }

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      const localStream = await ensureLocalStream();
      localStream.getAudioTracks().forEach((track: any) => pc.addTrack(track, localStream));

      // The agent will return an audio track for TTS output
      (pc as any).addEventListener('track', (event: any) => {
        const [remoteStream] = event?.streams ?? [];
        // Playing audio: react-native-webrtc routes audio when a remote track exists.
        if (remoteStream && typeof remoteStream.toURL === 'function') {
          // no-op, audio is handled by native session
        }
      });

      // Create the Realtime session SDP offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI Realtime REST endpoint; get answer SDP back
      const base = 'https://api.openai.com/v1/realtime';
      const sdpUrl = `${base}?model=${encodeURIComponent('gpt-4o-realtime-preview-2024-12-17')}&voice=${encodeURIComponent('verse')}`;
      const sdpResponse = await fetch(sdpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: offer.sdp ?? '',
      });

      const answerSdp = await sdpResponse.text();
      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed (${sdpResponse.status}): ${answerSdp.slice(0, 200)}`);
      }
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
      setIsConnected(true);
    } catch (err) {
      console.error('Voice connect error', err);
    } finally {
      setIsTalking(false);
    }
  };

  const hangup = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsConnected(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Assistant</Text>
      <View style={styles.row}>
        <Button title={isConnected ? 'Hang up' : (isTalking ? 'Connecting…' : 'Push to talk')} onPress={isConnected ? hangup : connect} />
      </View>
      {Platform.OS === 'ios' ? (
        <Text style={styles.hint}>Grant microphone permission on first use.</Text>
      ) : (
        <Text style={styles.hint}>Android may prompt for microphone permission.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { marginTop: 8, color: '#666' },
});


