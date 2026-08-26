// WebRTC service — handles peer connections for live class
const buildIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];
  // Add TURN server if configured (required for ~30% of networks behind symmetric NATs)
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return { iceServers: servers };
};

const ICE_SERVERS = buildIceServers();

export class WebRTCService {
  constructor() {
    this.peerConnections = new Map(); // socketId -> RTCPeerConnection
    this.remoteStreams = new Map();   // socketId -> MediaStream (from students)
    this.localStream = null;
    this.onTrackCallback = null;        // student-side: receives teacher stream
    this.onRemoteTrackCallback = null;  // teacher-side: receives student streams
    this.onConnectionStateChange = null;
  }

  // Get local media stream with graceful fallback
  async getLocalStream({ video = true, audio = true } = {}) {
    // Reuse existing stream if it is still active
    if (this.localStream && this.localStream.getTracks().some(t => t.readyState === 'live')) {
      return this.localStream;
    }

    // 1️⃣ Try with the requested constraints (video + audio)
    if (video) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
        return this.localStream;
      } catch (videoErr) {
        console.warn('⚠️ Video capture failed, falling back to audio-only:', videoErr.message);
      }
    }

    // 2️⃣ Fallback: audio only
    if (audio) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        return this.localStream;
      } catch (audioErr) {
        console.warn('⚠️ Audio capture also failed:', audioErr.message);
      }
    }

    // 3️⃣ Nothing available — return null instead of throwing so callers can continue
    console.error('❌ No media devices available');
    this.localStream = null;
    return null;
  }

  // Teacher: get screen share stream
  async getScreenStream() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      return screenStream;
    } catch (error) {
      console.error('Error getting screen stream:', error);
      throw error;
    }
  }

  // Teacher: create peer connection for a student
  async createPeerConnection(studentSocketId, socket) {
    // Clean up existing connection if student is reconnecting
    const existing = this.peerConnections.get(studentSocketId);
    if (existing) {
      try { existing.close(); } catch {}
      this.peerConnections.delete(studentSocketId);
      this.remoteStreams.delete(studentSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(studentSocketId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { to: studentSocketId, candidate: event.candidate });
      }
    };

    // Receive student's audio/video tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        this.remoteStreams.set(studentSocketId, stream);
        if (this.onRemoteTrackCallback) {
          this.onRemoteTrackCallback(studentSocketId, stream);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(studentSocketId, pc.connectionState);
      }
      // Clean up remote stream on disconnect
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.remoteStreams.delete(studentSocketId);
      }
    };

    return pc;
  }

  // Teacher: create and send offer to student
  async createOffer(studentSocketId, socket) {
    const pc = await this.createPeerConnection(studentSocketId, socket);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc-offer', { to: studentSocketId, offer });
    return pc;
  }

  // Student: create peer connection for receiving
  async createAnswerConnection(teacherSocketId, offer, socket) {
    // Clean up existing connection if reconnecting
    const existing = this.peerConnections.get(teacherSocketId);
    if (existing) {
      try { existing.close(); } catch {}
      this.peerConnections.delete(teacherSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(teacherSocketId, pc);

    // Add local audio tracks so teacher can hear the student
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    pc.ontrack = (event) => {
      if (this.onTrackCallback) {
        this.onTrackCallback(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { to: teacherSocketId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔗 Student connection to teacher: ${pc.connectionState}`);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(teacherSocketId, pc.connectionState);
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc-answer', { to: teacherSocketId, answer });
    return pc;
  }

  // Handle incoming answer (teacher side)
  async handleAnswer(studentSocketId, answer) {
    const pc = this.peerConnections.get(studentSocketId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(fromSocketId, candidate) {
    const pc = this.peerConnections.get(fromSocketId);
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  }

  // Close all connections
  closeAll() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  // Close one connection
  close(socketId) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }
  }

  // Replace video track in all active peer connections (for screen share)
  replaceVideoTrack(newTrack) {
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && newTrack) {
        sender.replaceTrack(newTrack).catch(err => {
          console.error('Error replacing video track:', err);
        });
      }
    });
  }

  // Replace audio track in all active peer connections
  replaceAudioTrack(newTrack) {
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
      if (sender && newTrack) {
        sender.replaceTrack(newTrack).catch(err => {
          console.error('Error replacing audio track:', err);
        });
      }
    });
  }

  setOnTrack(callback) {
    this.onTrackCallback = callback;
  }

  setOnRemoteTrack(callback) {
    this.onRemoteTrackCallback = callback;
  }

  setOnConnectionStateChange(callback) {
    this.onConnectionStateChange = callback;
  }
}

export const webRTCService = new WebRTCService();
export default webRTCService;
