import React, { useEffect, useRef, useState } from "react";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import "../index.css";
import * as faceapi from "face-api.js";

type MicDevice = {
  deviceId: string;
  label: string;
};

type TestStatus = "pending" | "success" | "failure";

type Results = {
  connectivity?: {
    pingMs?: number;
    downloadKbps?: number;
    downloadBytes?: number;
    details?: string;
    status?: TestStatus;
  };
  camera?: {
    supported: boolean;
    snapshotDataUrl?: string;
    resolution?: { width?: number; height?: number };
    deviceLabel?: string;
    status?: TestStatus;
  };
  mic?: {
    supported: boolean;
    rms?: number; // approx level
    recordedBlobSize?: number;
    deviceLabel?: string;
    status?: TestStatus;
  };
  faces?: number;
  timestamp: string;
};

export function Teste() {
  const [step, setStep] = useState<"connectivity" | "camera" | "mic" | "done">("connectivity");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Results>({ timestamp: new Date().toISOString() });

  // Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  // --- MICROPHONE STATE ---
  const [micDevices, setMicDevices] = useState<MicDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("default");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [permissionAsked, setPermissionAsked] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // --- CONNECTIVITY TEST ---
  async function runConnectivityTest() {
    setBusy(true);
    const start = performance.now();
    const pingUrl = "/chat-bot-animate.svg"; // small static resource
    try {
      await fetch(pingUrl, { cache: "no-store" });
      const pingMs = Math.round(performance.now() - start);

      const dlUrl = "/chat-bot-animate.svg";
      const dlStart = performance.now();
      const dlResp = await fetch(dlUrl, { cache: "no-store" });
      const dlBuffer = await dlResp.arrayBuffer();
      const dlMs = (performance.now() - dlStart) / 1000;
      const bytes = dlBuffer.byteLength;
      const kbps = Math.round((bytes * 8) / dlMs / 1000);

      const status: TestStatus = pingMs < 300 && kbps > 100 ? "success" : "failure";

      setResults(prev => ({
        ...prev,
        connectivity: {
          pingMs,
          downloadKbps: kbps,
          downloadBytes: bytes,
          details: `download time ${dlMs.toFixed(2)}s`,
          status,
        },
      }));
    } catch (err: any) {
      setResults(prev => ({ ...prev, connectivity: { details: `error: ${err?.message || err}`, status: "failure" } }));
    } finally {
      setBusy(false);
    }
  }

  // --- CAMERA TEST ---
  async function startCamera() {
    setBusy(true);
    try {
      if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
        setResults(prev => ({ ...prev, camera: { supported: false, status: "failure" } }));
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      currentStreamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
                initFaceDetection();
            };    
            await videoRef.current.play().catch(() => { });
        }
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      setResults(prev => ({
        ...prev,
        camera: {
          supported: true,
          resolution: { width: settings.width, height: settings.height },
          deviceLabel: track.label || undefined,
          status: "success",
        },
      }));
    } catch {
      setResults(prev => ({ ...prev, camera: { supported: false, status: "failure" } }));
    } finally {
      setBusy(false);
    }
  }

  function takeSnapshot() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setResults(prev => ({ ...prev, camera: { ...(prev.camera || {}), snapshotDataUrl: dataUrl } }));
  }

  function stopCamera() {
    stopDetection();
    const s = currentStreamRef.current;
    if (s) {
      s.getTracks().forEach(t => t.stop());
      currentStreamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); videoRef.current.srcObject = null; } catch {}
    }
  }

  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

    async function initFaceDetection() {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        detectionIntervalRef.current = setInterval(async () => {
            if (videoRef.current) {
                const faces = await faceapi.detectAllFaces(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
                );
                setResults(prev => ({
                    ...prev,
                    faces: faces.length
                }));
            }
        }, 200);
    }

    function stopDetection() {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
    }

  // --- MICROPHONE FUNCTIONS ---

  const maxLevelRef = useRef(0);

  async function enumerateMics() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const mics = list
        .filter(d => d.kind === "audioinput")
        .map(d => ({ deviceId: d.deviceId, label: d.label || "Microfone (não nomeado)" }));
      setMicDevices(mics);
    } catch (err: any) {
      setMicError(String(err?.message || err));
    }
  }

  async function requestPermissionAndList() {
    setMicError(null);
    try {
      setPermissionAsked(true);
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      await enumerateMics();
      s.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    } catch (err: any) {
      setMicError("Permissão para microfone negada ou erro: " + (err?.message ?? err));
    } finally {
      await enumerateMics();
    }
  }

  async function startListening() {
  setMicError(null);
  try {
    if (listening) stopListening();

    const constraints: MediaStreamConstraints =
      selectedMic && selectedMic !== "default"
        ? { audio: { deviceId: { exact: selectedMic } } }
        : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AC();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    recordedChunksRef.current = [];
    maxLevelRef.current = 0; // <--- reset do máximo no início
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = ev => { if (ev.data.size > 0) recordedChunksRef.current.push(ev.data); };
    recorder.start();

    setListening(true);
    rafRef.current = requestAnimationFrame(drawLevel);

    // Para teste curto de 3 segundos
    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 3000);

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current);

      // usa o RMS máximo detectado
      const status: TestStatus = maxLevelRef.current >= 0.01 ? "success" : "failure";

      setResults(prev => ({
        ...prev,
        mic: {
          ...(prev.mic || {}),
          rms: maxLevelRef.current,
          recordedBlobSize: blob.size,
          supported: true,
          deviceLabel: micDevices.find(d => d.deviceId === selectedMic)?.label,
          status,
        }
      }));

      stream.getTracks().forEach(t => t.stop());
    };

  } catch (err: any) {
    setMicError("Erro ao iniciar captura: " + (err?.message ?? err));
    setListening(false);
  }
}

  function stopListening() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    analyserRef.current = null;
    dataRef.current = null;
    mediaRecorderRef.current = null;
    setListening(false);
    setLevel(0);
  }

 
function drawLevel() {
  const analyser = analyserRef.current;
  const data = dataRef.current;
  if (!analyser || !data) { rafRef.current = requestAnimationFrame(drawLevel); return; }
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / data.length);
  setLevel(rms);

  // Atualiza o nível máximo
  if (rms > maxLevelRef.current) maxLevelRef.current = rms;

  rafRef.current = requestAnimationFrame(drawLevel);
}

  useEffect(() => {
    enumerateMics();
    return () => {
      stopCamera();
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (!listening) return;
    (async () => {
      stopListening();
      await new Promise(r => setTimeout(r, 150));
      startListening();
    })();
  }, [selectedMic]);

  function downloadResults() {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `connectivity-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- RENDER ---
  const pct = Math.min(level * 300, 100);

  const renderStatus = (status?: TestStatus) => {
    if (!status || status === "pending") return <span className="text-gray-400 text-xl">⏳</span>;
    if (status === "success") return <span className="text-green-600 text-xl">✅</span>;
    return <span className="text-red-600 text-xl">❌</span>;
  };

 return (
  <>
    <Header />
    <div className="min-h-screen flex flex-col items-center justify-start bg-bg-clarinho p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-roxo-escuro mb-4">
          Teste de conectividade e periféricos
        </h1>
        <p className="text-sm text-texto-escuro mb-6">
          Fluxo guiado: execute cada teste em sequência. Permita acesso à
          câmera/microfone quando perguntado.
        </p>

        <div className="bg-white rounded-xl shadow p-6">
          {/* NAV DE STEPS */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4">
            <button
              className={`px-3 py-1 rounded w-full sm:w-auto ${
                step === "connectivity"
                  ? "bg-verde-escuro text-white"
                  : "bg-quase-branco"
              }`}
              onClick={() => setStep("connectivity")}
            >
              1. Conectividade
            </button>
            <button
              className={`px-3 py-1 rounded w-full sm:w-auto ${
                step === "camera"
                  ? "bg-verde-escuro text-white"
                  : "bg-quase-branco"
              }`}
              onClick={() => setStep("camera")}
            >
              2. Câmera
            </button>
            <button
              className={`px-3 py-1 rounded w-full sm:w-auto ${
                step === "mic"
                  ? "bg-verde-escuro text-white"
                  : "bg-quase-branco"
              }`}
              onClick={() => setStep("mic")}
            >
              3. Microfone
            </button>
            <div className="w-full sm:ml-auto text-sm text-gray-500 mt-2 sm:mt-0">
              Status: {busy ? "Executando..." : "Pronto"}
            </div>
          </div>

          {/* --- CONNECTIVITY --- */}
          {step === "connectivity" && (
            <div>
              <h2 className="font-semibold mb-2">Teste de conectividade</h2>
              <p className="text-sm mb-4">
                Verificamos latência e velocidade de download (apenas para
                demonstração).
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy}
                  onClick={runConnectivityTest}
                  className="bg-verde-escuro text-white px-4 py-2 rounded w-full sm:w-auto"
                >
                  Iniciar teste
                </button>
                <button
                  onClick={() => {
                    setResults((prev) => ({ ...prev, connectivity: undefined }));
                  }}
                  className="px-3 py-2 rounded border w-full sm:w-auto"
                >
                  Resetar
                </button>
              </div>
              {results.connectivity && (
                <div className="mt-4 bg-bg-escurinho p-3 rounded flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  {renderStatus(results.connectivity.status)}
                  <div>
                    <p>Ping: {results.connectivity.pingMs ?? "—"} ms</p>
                    <p>
                      Download: {results.connectivity.downloadKbps ?? "—"} kbps (
                      {results.connectivity.downloadBytes ?? "—"} bytes)
                    </p>
                    <p className="text-sm text-gray-600">
                      {results.connectivity.details}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep("camera")}
                  className="px-4 py-2 rounded bg-quase-branco border"
                >
                  Próximo: Câmera
                </button>
              </div>
            </div>
          )}

          {/* --- CAMERA --- */}
          {step === "camera" && (
            <div>
              <h2 className="font-semibold mb-2">Teste de câmera</h2>
              <p className="text-sm mb-4">
                Permita acesso à câmera para ver o preview. Tire um snapshot para
                o relatório.
              </p>

              <div className="flex flex-col md:flex-row md:gap-4">
                <div className="md:w-1/2">
                  <div className="bg-black rounded mb-2 relative">
                    <video
                      ref={videoRef}
                      className="w-full h-64 object-contain rounded"
                      autoPlay
                      playsInline
                    />
                    {results.camera && (
                      <div className="absolute top-2 right-2">
                        {renderStatus(results.camera.status)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={startCamera}
                      className="px-3 py-2 rounded bg-verde-escuro text-white w-full sm:w-auto"
                    >
                      Ativar câmera
                    </button>
                    <button
                      onClick={takeSnapshot}
                      className="px-3 py-2 rounded border w-full sm:w-auto"
                    >
                      Tirar foto
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-3 py-2 rounded border w-full sm:w-auto"
                    >
                      Parar
                    </button>
                  </div>
                </div>

                <div className="md:w-1/2 mt-4 md:mt-0">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-64 bg-gray-100 rounded mb-2"
                  />
                  <div className="text-sm text-gray-700">
                    <p>
                      Resolução: {results.camera?.resolution?.width ?? "—"} x{" "}
                      {results.camera?.resolution?.height ?? "—"}
                    </p>
                    <p>Dispositivo: {results.camera?.deviceLabel ?? "—"}</p>
                    <p>
                        Rostos detectados: {results.faces ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <button
                  onClick={() => setStep("connectivity")}
                  className="px-4 py-2 rounded border w-full sm:w-auto"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep("mic")}
                  className="px-4 py-2 rounded bg-quase-branco border w-full sm:w-auto"
                >
                  Próximo: Microfone
                </button>
              </div>
            </div>
          )}

          {/* --- MICROPHONE --- */}
          {step === "mic" && (
            <div>
              <h2 className="font-semibold mb-2">Teste de microfone</h2>
              <p className="text-sm mb-4">
                Permita acesso ao microfone e fale. Vamos medir nível RMS e
                gravar ~3s para demonstrar captura.
              </p>

              {micError && (
                <div className="mb-3 text-sm text-red-600">{micError}</div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microfone
                </label>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="flex-1 border rounded p-2 min-w-[150px]"
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                  >
                    <option value="default">Padrão do sistema</option>
                    {micDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={requestPermissionAndList}
                    className="px-3 py-2 rounded border text-sm w-full sm:w-auto"
                  >
                    Listar / Permitir
                  </button>
                  <button
                    onClick={enumerateMics}
                    className="px-3 py-2 rounded border text-sm w-full sm:w-auto"
                    title="Atualiza lista (não pede permissão)"
                  >
                    Atualizar
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Dica: clique em “Listar / Permitir” para que o navegador
                  solicite permissão e mostre os nomes dos dispositivos.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 items-center mb-3">
                {!listening ? (
                  <button
                    disabled={busy}
                    onClick={startListening}
                    className="px-3 py-2 rounded bg-verde-escuro text-white w-full sm:w-auto"
                  >
                    Iniciar (usar selecionado)
                  </button>
                ) : (
                  <button
                    onClick={stopListening}
                    className="px-3 py-2 rounded border w-full sm:w-auto"
                  >
                    Parar
                  </button>
                )}
              </div>

              <div className="bg-bg-escurinho p-3 rounded">
                <p>
                  Microfone disponível: {results.mic?.supported ? "Sim" : "—"}{" "}
                  {renderStatus(results.mic?.status)}
                </p>
                <p>Nível RMS (aprox): {level.toFixed(3)}</p>
                <p>
                  Última gravação (bytes):{" "}
                  {results.mic?.recordedBlobSize ?? "—"}
                </p>
                <p>Dispositivo: {results.mic?.deviceLabel ?? "—"}</p>

                <div className="mt-4">
                  <div className="w-full h-4 bg-gray-200 rounded overflow-hidden">
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        transition: "width 120ms linear",
                        background:
                          pct > 66
                            ? "#16a34a"
                            : pct > 33
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Nível de áudio detectado
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <button
                  onClick={() => setStep("camera")}
                  className="px-4 py-2 rounded border w-full sm:w-auto"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep("done")}
                  className="px-4 py-2 rounded bg-quase-branco border w-full sm:w-auto"
                >
                  Ver resultados
                </button>
              </div>
            </div>
          )}

          {/* --- DONE --- */}
          {step === "done" && (
            <div>
              <h2 className="font-semibold mb-2">Resumo / Resultados</h2>
              <div className="bg-white p-4 rounded shadow">
                <pre className="text-sm max-h-64 overflow-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={downloadResults}
                    className="px-3 py-2 rounded bg-verde-escuro text-white w-full sm:w-auto"
                  >
                    Baixar relatório (JSON)
                  </button>
                  <button
                    onClick={() => {
                      setStep("connectivity");
                      setResults({ timestamp: new Date().toISOString() });
                    }}
                    className="px-3 py-2 rounded border w-full sm:w-auto"
                  >
                    Reiniciar testes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    <Footer />
  </>
);

}
