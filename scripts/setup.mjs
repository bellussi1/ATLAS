#!/usr/bin/env node
// Configura e verifica em um unico comando o ambiente local do ATLAS:
//   npm run setup            # prepara Node, cache/build de conteudo, Python/GPU (.venv) e modelos
//   npm run setup -- --check # apenas diagnostica o ambiente sem alterar nada
//   npm run setup -- --pull-models # tambem baixa modelos recomendados ausentes no Ollama
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { defaultEnvFile, parseEnvFile } from './content/r2-content.mjs';
import { resolveRagPython } from './rag-runner.mjs';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const RECOMMENDED_LOCAL_MODELS = [
  {
    id: 'qwen3:8b-q4_K_M',
    role: 'Extracao JSON estruturada de fontes publicas e historia politica',
    aliases: ['qwen3:8b-q4_k_m', 'qwen3:8b'],
  },
  {
    id: 'gemma2:9b-instruct-q4_K_M',
    role: 'Extracao/verificacao cruzada em portugues, prosa historica e juiz independente (9B)',
    aliases: ['gemma2:9b-instruct-q4_k_m', 'gemma2:9b'],
  },
  {
    id: 'hf.co/bartowski/EuroLLM-9B-Instruct-GGUF:Q4_K_M',
    role: 'Prosa historica, revisao editorial e sintese multilingue (PT/EN/ES/FR/DE)',
    aliases: ['eurollm-9b-instruct'],
  },
  {
    id: 'hf.co/IndexTeam/Index-Translate-9B-GGUF:Q4_K_M',
    role: 'Traducao tecnica e historiografica de fontes publicas (9B)',
    aliases: ['index-translate-9b'],
  },
  {
    id: 'hf.co/tencent/Hy-MT2-7B-GGUF:Q6_K',
    role: 'Traducao alternativa de alta precisao (Q6_K)',
    aliases: ['hy-mt2-7b-gguf:q6_k'],
  },
  {
    id: 'hf.co/BSC-LT/salamandraTA-7B-instruct-GGUF:Q4_K_M',
    role: 'Traducao e revisao em linguas ibericas/romanicas',
    aliases: ['salamandrata-7b-instruct'],
  },
];

export const RECOMMENDED_HF_MODELS = [
  {
    id: 'BAAI/bge-m3',
    cacheDirName: 'models--BAAI--bge-m3',
    role: 'Embeddings densos e esparsos na GPU local',
  },
  {
    id: 'BAAI/bge-reranker-v2-m3',
    cacheDirName: 'models--BAAI--bge-reranker-v2-m3',
    role: 'Reranking neural cross-encoder na GPU local',
  },
];

const REQUIRED_R2_KEYS = [
  'R2_ENDPOINT',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
];

function commandAvailable(cmd, args = ['--version']) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', timeout: 5000 });
  return {
    available: !res.error && res.status === 0,
    output: (res.stdout || '').trim(),
  };
}

function quoteWinArg(value) {
  return /[\s"&|<>^]/.test(value) ? `"${String(value).replaceAll('"', '""')}"` : String(value);
}

function runStep(command, args, { cwd = projectRoot, env = process.env } = {}) {
  const isWinCmd = process.platform === 'win32' && command.endsWith('.cmd');
  const res = isWinCmd
    ? spawnSync([command, ...args.map(quoteWinArg)].join(' '), {
        cwd,
        env,
        stdio: 'inherit',
        shell: true,
      })
    : spawnSync(command, args, {
        cwd,
        env,
        stdio: 'inherit',
      });
  return { ok: !res.error && res.status === 0, status: res.status ?? 1, error: res.error };
}

/** Interpreta a saida de `ollama list`. */
export function parseOllamaList(stdout) {
  const lines = String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const models = [];
  for (const line of lines) {
    if (line.toUpperCase().startsWith('NAME')) continue;
    const parts = line.split(/\s{2,}/);
    const name = parts[0]?.trim();
    if (!name) continue;
    models.push({
      name,
      id: parts[1]?.trim() ?? '',
      size: parts[2]?.trim() ?? '',
      modified: parts[3]?.trim() ?? '',
    });
  }
  return models;
}

/** Classifica modelos locais instalados contra os papeis recomendados do ATLAS. */
export function classifyOllamaModels(installedModels) {
  const normalized = installedModels.map((m) => ({
    ...m,
    lower: m.name.toLowerCase(),
  }));
  const matchedRoles = [];
  const missingRecommended = [];
  for (const spec of RECOMMENDED_LOCAL_MODELS) {
    const idLower = spec.id.toLowerCase();
    const match = normalized.find(
      (item) => item.lower === idLower || spec.aliases.some((alias) => item.lower.includes(alias)),
    );
    if (match) {
      matchedRoles.push({
        id: spec.id,
        installedName: match.name,
        size: match.size,
        role: spec.role,
      });
    } else {
      missingRecommended.push(spec);
    }
  }
  return {
    installed: installedModels.map((m) => m.name),
    matchedRoles,
    missingRecommended,
  };
}

function safeReadEnv(path, readFile = (p) => readFileSync(p, 'utf8'), exists = existsSync) {
  if (!path || !exists(path)) return { exists: false, keys: new Set() };
  try {
    const parsed = parseEnvFile(readFile(path));
    const keys = new Set(
      Object.entries(parsed)
        .filter(([, val]) => Boolean(val))
        .map(([key]) => key),
    );
    return { exists: true, keys };
  } catch {
    return { exists: true, keys: new Set() };
  }
}

/**
 * Verifica presenca de credenciais R2 e APIs sem jamais retornar ou imprimir segredos.
 */
export function checkCredentialStatus({
  env = process.env,
  r2EnvPath = defaultEnvFile(),
  dotEnvPath = join(projectRoot, '.env'),
  exists = existsSync,
  readFile = (p) => readFileSync(p, 'utf8'),
} = {}) {
  const r2File = safeReadEnv(r2EnvPath, readFile, exists);
  const dotEnv = safeReadEnv(dotEnvPath, readFile, exists);
  const hasKey = (key) => Boolean(env[key]) || r2File.keys.has(key) || dotEnv.keys.has(key);
  const r2MissingKeys = REQUIRED_R2_KEYS.filter((key) => !hasKey(key));
  return {
    r2FilePath: r2EnvPath,
    r2FileExists: r2File.exists,
    r2Configured: r2MissingKeys.length === 0,
    r2MissingKeys,
    cloudflareDeploy: hasKey('CLOUDFLARE_API_TOKEN') && hasKey('CLOUDFLARE_ACCOUNT_ID'),
    paidApis: {
      anthropic: hasKey('ANTHROPIC_API_KEY'),
      gemini: hasKey('GEMINI_API_KEY'),
      deepseek: hasKey('DEEPSEEK_API_KEY'),
    },
  };
}

/** Verifica cache local dos modelos HuggingFace (bge-m3 e bge-reranker-v2-m3). */
export function checkHuggingFaceModels(
  cacheRoot = process.env.HF_HOME
    ? join(process.env.HF_HOME, 'hub')
    : join(homedir(), '.cache', 'huggingface', 'hub'),
  exists = existsSync,
) {
  return RECOMMENDED_HF_MODELS.map((spec) => ({
    ...spec,
    cached: exists(join(cacheRoot, spec.cacheDirName)),
  }));
}

function probePythonGpu(pythonExe) {
  if (!pythonExe) return { torchAvailable: false, cudaAvailable: false, gpuName: null, vramGb: 0 };
  const snippet =
    'import json\ntry:\n import torch, atlas_rag\n gpu = torch.cuda.get_device_name(0) if torch.cuda.is_available() else None\n vram = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2) if torch.cuda.is_available() else 0\n print(json.dumps({"torchAvailable": True, "atlasRag": True, "cudaAvailable": bool(torch.cuda.is_available()), "gpuName": gpu, "vramGb": vram}))\nexcept Exception as e:\n print(json.dumps({"torchAvailable": False, "atlasRag": False, "cudaAvailable": False, "error": str(e)}))\n';
  const res = spawnSync(pythonExe, ['-c', snippet], { encoding: 'utf8', timeout: 15000 });
  if (res.error || res.status !== 0) {
    return {
      torchAvailable: false,
      atlasRag: false,
      cudaAvailable: false,
      gpuName: null,
      vramGb: 0,
    };
  }
  try {
    return JSON.parse((res.stdout || '').trim());
  } catch {
    return {
      torchAvailable: false,
      atlasRag: false,
      cudaAvailable: false,
      gpuName: null,
      vramGb: 0,
    };
  }
}

/** Inspeciona todo o ambiente local do projeto sem alterar arquivos. */
export function inspectEnvironment({ rootDir = projectRoot, probeGpu = true } = {}) {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const nodeModulesReady = existsSync(join(rootDir, 'node_modules'));
  const pointerReady = existsSync(join(rootDir, 'content', 'content-pointer.json'));
  const cachePointerReady = existsSync(join(rootDir, 'generated', 'content-cache', 'pointer.json'));
  const builtManifestReady = existsSync(join(rootDir, 'generated', 'content', 'manifest.json'));
  const pythonExe = resolveRagPython(rootDir);
  const uv = commandAvailable('uv', ['--version']);
  const ollamaCheck = commandAvailable('ollama', ['list']);
  const ollamaModels = ollamaCheck.available ? parseOllamaList(ollamaCheck.output) : [];
  const ollamaReport = classifyOllamaModels(ollamaModels);
  const gpu = probeGpu
    ? probePythonGpu(pythonExe)
    : { cudaAvailable: false, atlasRag: Boolean(pythonExe) };
  const hfModels = checkHuggingFaceModels();
  const credentials = checkCredentialStatus();

  return {
    node: { version: process.version, ok: nodeMajor >= 22, nodeModulesReady },
    content: { pointerReady, cachePointerReady, builtManifestReady },
    rag: {
      venvReady: Boolean(pythonExe),
      pythonExe,
      uvAvailable: uv.available,
      uvVersion: uv.output,
      ...gpu,
    },
    ollama: {
      available: ollamaCheck.available,
      ...ollamaReport,
    },
    huggingface: hfModels,
    credentials,
  };
}

/** Formata resumo legivel com o estado do ambiente e os atalhos principais. */
export function buildSetupSummary(report) {
  const okMark = (flag) => (flag ? '[ok]' : '[pendente]');
  const lines = [
    '=== ATLAS — Diagnostico e Setup Local ===',
    `${okMark(report.node.ok && report.node.nodeModulesReady)} Node.js ${report.node.version} | node_modules: ${report.node.nodeModulesReady ? 'instalado' : 'ausente'}`,
    `${okMark(report.content.pointerReady && report.content.builtManifestReady)} Conteudo | ponteiro: ${report.content.pointerReady ? 'sim' : 'nao'} | cache R2: ${report.content.cachePointerReady ? 'sim' : 'nao'} | build local: ${report.content.builtManifestReady ? 'sim' : 'nao'}`,
    `${okMark(report.rag.venvReady && report.rag.atlasRag !== false)} Python RAG (.venv): ${report.rag.venvReady ? 'pronto' : 'ausente'} | uv: ${report.rag.uvAvailable ? report.rag.uvVersion : 'nao detectado'} | GPU: ${report.rag.cudaAvailable ? `${report.rag.gpuName} (${report.rag.vramGb} GB)` : 'CPU / nao detectada'}`,
    `${okMark(report.ollama.available)} Ollama local: ${report.ollama.installed.length} modelo(s) instalado(s)`,
  ];
  for (const item of report.ollama.matchedRoles) {
    lines.push(`    - ${item.installedName} (${item.size || '?'}) -> ${item.role}`);
  }
  for (const missing of report.ollama.missingRecommended) {
    lines.push(`    - [opcional] ${missing.id} -> ${missing.role}`);
  }
  for (const hf of report.huggingface) {
    lines.push(`    - ${okMark(hf.cached)} HuggingFace ${hf.id} -> ${hf.role}`);
  }
  lines.push(
    `${okMark(report.credentials.r2Configured)} Credenciais R2 (${report.credentials.r2FilePath}): ${report.credentials.r2Configured ? 'pronto para publicar' : `faltam: ${report.credentials.r2MissingKeys.join(', ')}`}`,
  );
  lines.push(
    `    - APIs pagas detectadas: Anthropic=${report.credentials.paidApis.anthropic ? 'sim' : 'nao'}, Gemini=${report.credentials.paidApis.gemini ? 'sim' : 'nao'}, DeepSeek=${report.credentials.paidApis.deepseek ? 'sim' : 'nao'}`,
  );
  lines.push('', 'Comandos simplificados:');
  lines.push(
    '  npm run setup           -> prepara tudo (Node, R2 cache, conteudo, Python/GPU e diagnostico)',
  );
  lines.push('  npm start               -> abre o site local em http://localhost:4200');
  lines.push('  npm run publish:check   -> valida e simula publicacao R2 + Pages (--dry-run)');
  lines.push('  npm run content:publish -> compila e publica conteudo no Cloudflare R2');
  lines.push('  npm run rag:models      -> lista modelos locais de extracao, traducao e embedding');
  lines.push(
    '  npm run rag:ingest      -> extrai, verifica citacao e embebeda fontes publicas localmente',
  );
  lines.push('  npm run rag:mine        -> minera filas humanas do acervo sem gastar API');
  lines.push('  npm run rag:eval        -> roda gates de regressao do pipeline RAG');
  return lines.join('\n');
}

export function runSetup(argv = process.argv.slice(2), { rootDir = projectRoot } = {}) {
  const args = new Set(argv);
  const checkOnly = args.has('--check') || args.has('--dry-run');
  const asJson = args.has('--json');
  const skipRag = args.has('--skip-rag');
  const skipFetch = args.has('--skip-fetch');
  const pullModels = args.has('--pull-models');

  if (checkOnly) {
    const report = inspectEnvironment({ rootDir });
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(buildSetupSummary(report));
    }
    return report.node.ok && report.content.pointerReady ? 0 : 1;
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  if (!existsSync(join(rootDir, 'node_modules'))) {
    console.log('[1/4] Instalando dependencias Node (npm install)...');
    const inst = runStep(npmCmd, ['install'], { cwd: rootDir });
    if (!inst.ok) return inst.status;
  } else {
    console.log('[1/4] Dependencias Node ja instaladas (node_modules presente).');
  }

  console.log('[2/4] Sincronizando e compilando conteudo...');
  if (!skipFetch) {
    const fetched = runStep(npmCmd, ['run', 'content:fetch'], { cwd: rootDir });
    if (!fetched.ok) {
      console.warn('Aviso: content:fetch falhou; tentando seguir com o conteudo local.');
    }
  }
  const built = runStep(npmCmd, ['run', 'content:build'], { cwd: rootDir });
  if (!built.ok) return built.status;

  if (!skipRag) {
    console.log('[3/4] Preparando ambiente Python/GPU em experiments/rag/.venv...');
    const uv = commandAvailable('uv', ['--version']);
    let pythonExe = resolveRagPython(rootDir);
    if (!pythonExe) {
      if (uv.available) {
        const venvRes = runStep('uv', ['venv', '--python', '3.12', 'experiments/rag/.venv'], {
          cwd: rootDir,
        });
        if (!venvRes.ok) return venvRes.status;
      } else {
        const pyRes = runStep('python', ['-m', 'venv', 'experiments/rag/.venv'], {
          cwd: rootDir,
        });
        if (!pyRes.ok) return pyRes.status;
      }
      pythonExe = resolveRagPython(rootDir);
    }
    const gpuProbe = probePythonGpu(pythonExe);
    if (pythonExe && gpuProbe.atlasRag !== true) {
      const pipArgs = uv.available
        ? ['pip', 'install', '--python', pythonExe, '-e', 'experiments/rag']
        : ['-m', 'pip', 'install', '-e', 'experiments/rag'];
      const pipCmd = uv.available ? 'uv' : pythonExe;
      const pipRes = runStep(pipCmd, pipArgs, { cwd: rootDir });
      if (!pipRes.ok) return pipRes.status;
    }
  } else {
    console.log('[3/4] Etapa Python/GPU pulada (--skip-rag).');
  }

  console.log('[4/4] Verificando modelos locais e credenciais...');
  if (pullModels) {
    const initial = inspectEnvironment({ rootDir, probeGpu: false });
    if (initial.ollama.available && initial.ollama.missingRecommended.length > 0) {
      for (const spec of initial.ollama.missingRecommended) {
        console.log(`Baixando modelo recomendado no Ollama: ${spec.id}...`);
        runStep('ollama', ['pull', spec.id], { cwd: rootDir });
      }
    }
  }

  const finalReport = inspectEnvironment({ rootDir });
  if (asJson) {
    console.log(JSON.stringify(finalReport, null, 2));
  } else {
    console.log('');
    console.log(buildSetupSummary(finalReport));
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runSetup();
}
