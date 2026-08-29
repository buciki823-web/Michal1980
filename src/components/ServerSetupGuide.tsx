import React, { useState } from 'react';
import { Terminal, Server, Radio, Check, Copy, AlertCircle, RefreshCw, Cpu, Volume2, ShieldCheck } from 'lucide-react';
import { ScriptSettings, VoiceOption } from '../types';

interface ServerSetupGuideProps {
  isServerOnline: boolean | null;
  checkServerHealth: () => void;
  isCheckingServer: boolean;
  availableVoices: VoiceOption[];
}

export const ServerSetupGuide: React.FC<ServerSetupGuideProps> = ({
  isServerOnline,
  checkServerHealth,
  isCheckingServer,
  availableVoices
}) => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const PYTHON_SERVER_SCRIPT = `from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import subprocess
import os

app = Flask(__name__)
CORS(app)

# Mapowanie ID głosów do plików modeli ONNX w katalogu z modelami
VOICE_MODELS = {
    "jarvis": "models/pl_PL-jarvis-medium.onnx",
    "gosia": "models/pl_PL-gosia-medium.onnx",
    "bass": "models/pl_PL-bass-medium.onnx",
    "justyna": "models/pl_PL-justyna-medium.onnx",
    "meski": "models/pl_PL-meski_wg-medium.onnx",
    "zenski": "models/pl_PL-zenski_wg-medium.onnx",
}

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "piper-tts", "version": "2.3.0"})

@app.route("/tts", methods=["POST"])
def tts():
    data = request.get_json(force=True)
    text = data.get("text", "")
    voice_id = data.get("voice", "jarvis")
    speed = float(data.get("speed", 1.0))
    
    model_path = VOICE_MODELS.get(voice_id, "models/pl_PL-jarvis-medium.onnx")
    
    # Wywołanie binarnego silnika Piper TTS
    # piper --model <model> --length_scale <1/speed> --output_file -
    length_scale = round(1.0 / max(0.5, speed), 2)
    
    cmd = [
        "piper",
        "--model", model_path,
        "--length_scale", str(length_scale),
        "--output_file", "-"
    ]
    
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    wav_bytes, err = p.communicate(input=text.encode("utf-8"))
    
    if p.returncode != 0:
        return jsonify({"error": "Piper synthesis failed"}), 500
        
    return Response(wav_bytes, mimetype="audio/wav")

if __name__ == "__main__":
    print("Piper TTS Serwer uruchomiony na porcie 8765...")
    app.run(host="127.0.0.1", port=8765, debug=False)`;

  const DOCKER_COMMAND = `docker run -d --name piper-server -p 8765:8765 \\
  -v ./models:/models \\
  ghcr.io/rhasspy/wyoming-piper:latest \\
  --voice pl_PL-jarvis-medium \\
  --uri tcp://0.0.0.0:8765`;

  const PIPER_EXE_CMD = `# Windows / Linux uruchomienie bezpośrednie
piper --model models/pl_PL-jarvis-medium.onnx --server 127.0.0.1:8765`;

  return (
    <div className="space-y-6">
      {/* Server Health Status Card */}
      <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
            isServerOnline === true
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
              : isServerOnline === false
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-400'
              : 'bg-[#0e0e11] border-neutral-800 text-neutral-400'
          }`}>
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Status Lokalnego Serwera Piper TTS</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#18181c] border border-neutral-700/60 text-neutral-300 font-mono">
                http://127.0.0.1:8765
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              {isServerOnline === true
                ? '🟢 Połączono pomyślnie! Serwer odpowiada na /health i generuje audio w milisekundach.'
                : isServerOnline === false
                ? '🟡 Serwer jest offline lub blokowany przez CORS w przeglądarce. Skrypt Tampermonkey z @grant GM_xmlhttpRequest ominie to bez problemu na stronach docelowych.'
                : 'Kliknij przycisk poniżej, aby sprawdzić odpowiedź serwera na porcie 8765.'}
            </p>
          </div>
        </div>

        <button
          onClick={checkServerHealth}
          disabled={isCheckingServer}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/80 text-white text-xs font-semibold transition shrink-0 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isCheckingServer ? 'animate-spin' : ''}`} />
          {isCheckingServer ? 'Sprawdzanie...' : 'Sprawdź połączenie'}
        </button>
      </div>

      {/* Voice Models List */}
      <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-400" />
          Obsługiwane Głosy w Skrypcie (AVAILABLE_VOICES)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {availableVoices.map((voice) => (
            <div
              key={voice.id}
              className="p-3.5 rounded-xl bg-[#0e0e11]/90 border border-neutral-800/80 flex items-center justify-between shadow-sm"
            >
              <div>
                <div className="text-xs font-semibold text-white">{voice.name}</div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">ID: {voice.id}</div>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono ${
                voice.gender === 'male'
                  ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40'
                  : 'bg-pink-950/60 text-pink-300 border border-pink-800/40'
              }`}>
                {voice.gender === 'male' ? 'Męski' : 'Żeński'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* How to Run Piper Locally */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option 1: Python Flask Server */}
        <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Opcja A: Serwer Python Flask (Zalecana)
              </h3>
              <button
                onClick={() => copyToClipboard(PYTHON_SERVER_SCRIPT, 'python')}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center gap-1.5 transition border border-neutral-700/80"
              >
                {copiedSnippet === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Kopiuj kod
              </button>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Wygodny lekki skrypt HTTP obsługujący endpointy <code className="text-indigo-400">/health</code> oraz <code className="text-indigo-400">/tts</code> z pełnym dynamicznym przełączaniem głosów.
            </p>
            <pre className="bg-[#09090b] p-3.5 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-56 leading-relaxed">
              {PYTHON_SERVER_SCRIPT}
            </pre>
          </div>
          <div className="text-[11px] text-neutral-500">
            Wymagania: <code className="text-neutral-300">pip install flask flask-cors piper-tts</code>
          </div>
        </div>

        {/* Option 2: Docker & Direct Binary */}
        <div className="space-y-6">
          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                Opcja B: Docker Container
              </h3>
              <button
                onClick={() => copyToClipboard(DOCKER_COMMAND, 'docker')}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center gap-1.5 transition border border-neutral-700/80"
              >
                {copiedSnippet === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Kopiuj
              </button>
            </div>
            <pre className="bg-[#09090b] p-3.5 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {DOCKER_COMMAND}
            </pre>
          </div>

          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Opcja C: Bezpośrednie wywołanie piper.exe
              </h3>
              <button
                onClick={() => copyToClipboard(PIPER_EXE_CMD, 'exe')}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center gap-1.5 transition border border-neutral-700/80"
              >
                {copiedSnippet === 'exe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Kopiuj
              </button>
            </div>
            <pre className="bg-[#09090b] p-3.5 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {PIPER_EXE_CMD}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
