import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Net } from "@/components/Match";

type Msg = { t: "ready" } | { t: "offer" | "answer"; sdp: RTCSessionDescriptionInit } | { t: "ice"; c: RTCIceCandidateInit };

/** Peer-to-peer voice using the match channel for signalling. Host always makes the offer. */
export function VoiceChat({ net }: { net: Net }) {
  const [on, setOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const remoteReady = useRef(false), offered = useRef(false), sentReadyReply = useRef(false);
  const pending = useRef<RTCIceCandidateInit[]>([]);
  const host = net.role === "host";

  const offer = async () => {
    const p = pc.current; if (!p || offered.current) return;
    offered.current = true;
    await p.setLocalDescription(await p.createOffer());
    net.send("rtc", { t: "offer", sdp: p.localDescription!.toJSON() });
  };

  useEffect(() => {
    net.rtc = async (raw) => {
      const m = raw as Msg, p = pc.current;
      if (m.t === "ready") {
        remoteReady.current = true;
        if (p && host) void offer();
        if (p && !host && !sentReadyReply.current) { sentReadyReply.current = true; net.send("rtc", { t: "ready" }); }
        return;
      }
      if (!p) return;
      if (m.t === "offer") {
        await p.setRemoteDescription(m.sdp);
        pending.current.splice(0).forEach((c) => void p.addIceCandidate(c));
        await p.setLocalDescription(await p.createAnswer());
        net.send("rtc", { t: "answer", sdp: p.localDescription!.toJSON() });
      } else if (m.t === "answer") {
        await p.setRemoteDescription(m.sdp);
        pending.current.splice(0).forEach((c) => void p.addIceCandidate(c));
      } else if (m.t === "ice") {
        if (p.remoteDescription) void p.addIceCandidate(m.c); else pending.current.push(m.c);
      }
    };
    return () => { net.rtc = undefined; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net]);

  const stop = () => {
    pc.current?.close(); pc.current = null;
    stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null;
    offered.current = false; sentReadyReply.current = false; setOn(false); setStatus("");
  };

  const start = async () => {
    try {
      setStatus("Connecting…");
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const p = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pc.current = p;
      s.getTracks().forEach((t) => p.addTrack(t, s));
      p.onicecandidate = (e) => { if (e.candidate) net.send("rtc", { t: "ice", c: e.candidate.toJSON() }); };
      p.ontrack = (e) => { if (audio.current) { audio.current.srcObject = e.streams[0] ?? null; void audio.current.play().catch(() => {}); } };
      p.onconnectionstatechange = () => setStatus(p.connectionState === "connected" ? "Live" : p.connectionState === "failed" ? "Couldn't connect" : "Connecting…");
      setOn(true);
      net.send("rtc", { t: "ready" });
      if (host && remoteReady.current) void offer();
    } catch { setStatus("Microphone blocked"); stop(); setStatus("Microphone blocked"); }
  };

  const toggleMute = () => { const m = !muted; stream.current?.getAudioTracks().forEach((t) => (t.enabled = !m)); setMuted(m); };

  return (
    <div className="flex items-center gap-2">
      <audio ref={audio} autoPlay />
      {!on ? <Button variant="ghost" className="chip" onClick={() => void start()}>🎤 Voice</Button> : (
        <>
          <Button variant="ghost" className={muted ? "chip" : "chip chip-on"} onClick={toggleMute}>{muted ? "🔇 Muted" : "🎙️ On"}</Button>
          <Button variant="ghost" className="chip" onClick={stop}>End voice</Button>
        </>
      )}
      {status && <span className="text-xs text-muted-foreground">{status}</span>}
    </div>
  );
}
