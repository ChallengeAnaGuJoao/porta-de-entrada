import React, { useRef, useState } from 'react';
  const TEST_DURATION = 3; // segundos

const TEST_FILE_URL = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export default function NetworkTest({ onFinish }: { onFinish: (result: {
  downloadMbps: number,
  uploadMbps: number,
  prepDuration: number,
  status: "success" | "failure"
}) => void }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [preTestDuration, setPreTestDuration] = useState<number | null>(null);
  const [downloadMbps, setDownloadMbps] = useState<string | null>(null);
  const [uploadMbps, setUploadMbps] = useState<string | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState('');
  const [testDone, setTestDone] = useState(false);
  const [testDuration, setTestDuration] = useState<number | null>(null);

  const handleReady = () => {
    setReady(true);
    setTimerStart(performance.now());
    setTestDone(false);
    setPreTestDuration(null);
  };
  const handleStartTest = async () => {
    setNetworkError('');
    setDownloadMbps(null);
    setUploadMbps(null);
    setNetworkLoading(true);
    // Calcular tempo de preparação
    let prepDuration = null;
    if (timerStart) {
      prepDuration = (performance.now() - timerStart) / 1000;
      setPreTestDuration(prepDuration);
    }
    setProgress(0);
    setNetworkLoading(true);
    const startTime = performance.now();
    let running = true;
    const updateProgress = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      setProgress(Math.min(99, (elapsed / TEST_DURATION) * 100));
      if (running) {
        requestAnimationFrame(updateProgress);
      }
    };
    requestAnimationFrame(updateProgress);
    try {
      // Download test
      const startDownload = performance.now();
      const resp = await fetch(TEST_FILE_URL);
      const blob = await resp.blob();
      const endDownload = performance.now();
      const sizeBytes = blob.size;
      const timeSec = (endDownload - startDownload) / 1000;
      const mbps = ((sizeBytes * 8) / 1e6) / timeSec;
      setDownloadMbps(mbps.toFixed(2));

      // Upload test (simulate by sending small blob)
      const uploadData = new Uint8Array(100 * 1024); // 100KB
      const startUpload = performance.now();
      await fetch('https://httpbin.org/post', {
        method: 'POST',
        body: uploadData,
      });
      const endUpload = performance.now();
      const uploadTimeSec = (endUpload - startUpload) / 1000;
      const uploadMbps = ((uploadData.length * 8) / 1e6) / uploadTimeSec;
      setUploadMbps(uploadMbps.toFixed(2));
  running = false;
  setNetworkLoading(false);
  setTestDone(true);
  setProgress(100);
    } catch (err) {
  running = false;
  setNetworkError('Erro ao testar a rede.');
  setProgress(0);
  setNetworkLoading(false);
  setTestDone(true);
    }
  };
  // Barra de progresso
  const ProgressBar = ({ value }: { value: number }) => (
    <div style={{ width: '100%', height: '12px', background: '#eee', borderRadius: '8px', margin: '16px 0' }}>
      <div style={{ width: `${value}%`, height: '100%', background: '#6c2eb6', borderRadius: '8px', transition: 'width 0.2s' }} />
    </div>
  );

  return (
  <div className="network-card">
      <h2 className="text-lg font-semibold mb-4">Teste de Rede</h2>
      {!ready ? (
        <>
          <p className="mb-6 text-gray-700">Pronto para o teste?</p>
          <button className="bg-green-900 text-white rounded-full px-6 py-2 mb-4 hover:bg-green-800 transition" onClick={handleReady}>
            SIM
          </button>
        </>
      ) : (
        <>
          <button className="bg-green-900 text-white rounded-full px-6 py-2 mb-4 hover:bg-green-800 transition" onClick={handleStartTest} disabled={networkLoading}>
            {networkLoading ? 'Testando...' : 'Começar Teste de Rede'}
          </button>
      {/* Barra de progresso durante o teste */}
      {(!testDone && !networkError && !ready && !networkLoading) ? null : (networkLoading && !testDone) ? <ProgressBar value={progress} /> : null}
          <div className="w-full flex flex-col items-center mt-2">
            {downloadMbps && (<p className="text-green-900">Download: {downloadMbps} Mbps</p>)}
            {uploadMbps && (<p className="text-green-900">Upload: {uploadMbps} Mbps</p>)}
            {networkError && (
              <>
                <p className="text-red-500 mt-2">{networkError}</p>
                <button 
                    className="mt-6 bg-green-600 text-white rounded-full px-6 py-2 hover:bg-green-700 transition" 
                    onClick={() => { setTestDone(false); 
                    onFinish({
                        downloadMbps: 0,
                        uploadMbps: 0,
                        prepDuration: preTestDuration ?? 0,
                        status: "failure"
                    });
                    }}
                >        
                  Ir para o próximo teste
                </button>
              </>
            )}
            {downloadMbps && uploadMbps && !networkError && (
              <div className="mt-4">
                {parseFloat(downloadMbps) >= 25 && parseFloat(uploadMbps) >= 3 ? (
                  <span className="font-bold">Conexão boa para videoconferência.</span>
                ) : (
                  <span className="text-red-500 font-bold">Conexão abaixo do ideal para videoconferência.</span>
                )}
              </div>
            )}
          </div>
          {testDone && !networkError && (
            <>
              <div className="w-full flex flex-col items-center mt-4">
                <p className="text-green-900 font-bold mb-2">Teste de rede realizado!</p>
                {preTestDuration !== null && (
                  <p className="text-gray-700 mb-2">Tempo de preparação: {preTestDuration.toFixed(2)} segundos</p>
                )}
                {testDuration !== null && (
                  <p className="text-gray-700 mb-2">Duração do teste: {testDuration.toFixed(2)} segundos</p>
                )}
              </div>
              <button 
                className="mt-6 bg-green-900 text-white rounded-full px-6 py-2 hover:bg-green-800 transition" 
                onClick={() => { 
                    setTestDone(false); 
                    if (preTestDuration !== null && downloadMbps && uploadMbps) {
                        onFinish({
                            downloadMbps: parseFloat(downloadMbps),
                            uploadMbps: parseFloat(uploadMbps),
                            prepDuration: preTestDuration,
                            status: (parseFloat(downloadMbps) >= 25 && parseFloat(uploadMbps) >= 3) ? "success" : "failure"
                        });
                    }
                }}
            >
                Ir para o próximo teste
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}