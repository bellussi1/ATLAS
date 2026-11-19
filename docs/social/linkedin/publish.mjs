#!/usr/bin/env node
/**
 * Publicação de um post da série no LinkedIn, via API oficial (Posts + Documents).
 *
 *   node docs/social/linkedin/publish.mjs --post 01-itinerarios --dry-run
 *   node docs/social/linkedin/publish.mjs --post 01-itinerarios --publish
 *
 * Requer um app aprovado no LinkedIn com o escopo `w_member_social` (perfil) ou
 * `w_organization_social` (página) e as variáveis:
 *
 *   LINKEDIN_ACCESS_TOKEN   token OAuth do autor
 *   LINKEDIN_AUTHOR_URN     urn:li:person:... ou urn:li:organization:...
 *   LINKEDIN_VERSION        opcional, padrão 202611 (formato AAAAMM)
 *
 * Sem `--publish`, nada sai da máquina: o padrão é `--dry-run`, que valida o texto,
 * o carrossel e monta o payload. O token nunca é gravado em disco nem impresso.
 */
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { parsePostFile, validatePostText } from './schedule.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.linkedin.com/rest';
const DEFAULT_VERSION = '202611';
const MAX_COMMENTARY = 3000;

const headers = (token, version) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-restli-protocol-version': '2.0.0',
  'linkedin-version': version,
});

async function readPost(folder) {
  const postDir = resolve(here, 'posts', folder);
  const postPath = join(postDir, 'post.txt');
  const post = parsePostFile(await readFile(postPath, 'utf8'));
  const validation = validatePostText(post.text);
  const pdfPath = join(postDir, 'carrossel.pdf');
  let pdf = null;
  try {
    const info = await stat(pdfPath);
    pdf = { path: pdfPath, bytes: info.size };
  } catch {
    pdf = null;
  }
  return { postDir, post, validation, pdf };
}

function buildCommentary(post, includeHashtags = true) {
  const hashtags = includeHashtags ? post.hashtags.trim() : '';
  return [post.text.trim(), hashtags].filter(Boolean).join('\n\n');
}

async function linkedinError(response) {
  const body = await response.text().catch(() => '');
  return `LinkedIn ${response.status}: ${body.slice(0, 600) || response.statusText}`;
}

/** Sobe o PDF como Documento e devolve o URN pronto para o post. */
export async function uploadDocument({ token, owner, version, pdfPath }) {
  const init = await fetch(`${API}/documents?action=initializeUpload`, {
    method: 'POST',
    headers: headers(token, version),
    body: JSON.stringify({ initializeUploadRequest: { owner } }),
  });
  if (!init.ok) throw new Error(await linkedinError(init));
  const initialized = await init.json();
  const uploadUrl = initialized.value?.uploadUrl;
  const documentUrn = initialized.value?.document;
  if (!uploadUrl || !documentUrn) throw new Error('LinkedIn não devolveu uploadUrl/document');

  const binary = await readFile(pdfPath);
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/pdf',
    },
    body: binary,
  });
  if (!upload.ok) throw new Error(await linkedinError(upload));

  // O processamento é assíncrono; espera o documento ficar AVAILABLE.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const check = await fetch(`${API}/documents/${encodeURIComponent(documentUrn)}`, {
      headers: headers(token, version),
    });
    if (check.ok) {
      const document = await check.json();
      if (document.status === 'AVAILABLE') return { documentUrn, status: document.status };
      if (document.status === 'PROCESSING_FAILED') {
        throw new Error('LinkedIn recusou o PDF (PROCESSING_FAILED)');
      }
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1500));
  }
  throw new Error('Documento ainda em processamento após 30 s; publique manualmente ou repita');
}

/** Cria o post; devolve o URN retornado em `x-restli-id`. */
export async function createPost({ token, author, version, commentary, documentUrn, title }) {
  const payload = {
    author,
    commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
    ...(documentUrn ? { content: { media: { title: title.slice(0, 100), id: documentUrn } } } : {}),
  };
  const response = await fetch(`${API}/posts`, {
    method: 'POST',
    headers: headers(token, version),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await linkedinError(response));
  return {
    postUrn: response.headers.get('x-restli-id') ?? null,
    payload,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({
    options: {
      post: { type: 'string' },
      publish: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'text-only': { type: 'boolean', default: false },
      'no-hashtags': { type: 'boolean', default: false },
    },
  });

  try {
    if (!values.post) throw new Error('informe --post <pasta>, por exemplo 10-mapa');
    const { postDir, post, validation, pdf } = await readPost(values.post);
    const commentary = buildCommentary(post, !values['no-hashtags']);

    if (validation.issues.length > 0) {
      throw new Error(`post reprovado na checagem: ${validation.issues.join('; ')}`);
    }
    if (!commentary) throw new Error('texto do post vazio');
    if (commentary.length > MAX_COMMENTARY) {
      throw new Error(`texto com ${commentary.length} caracteres; limite ${MAX_COMMENTARY}`);
    }
    if (!values['text-only'] && !pdf) {
      throw new Error('carrossel.pdf ausente; rode render-carousels.mjs ou use --text-only');
    }

    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const author = process.env.LINKEDIN_AUTHOR_URN;
    const version = process.env.LINKEDIN_VERSION || DEFAULT_VERSION;
    const dryRun = !values.publish;

    console.log(`[linkedin] ${values.post} — ${post.title}`);
    console.log(`  texto: ${commentary.length}/${MAX_COMMENTARY} caracteres`);
    console.log(`  links: ${JSON.stringify(validation.links)}`);
    console.log(
      `  documento: ${values['text-only'] ? 'não' : pdf ? `${pdf.bytes} bytes` : 'ausente'}`,
    );
    console.log(`  author: ${author ?? '(LINKEDIN_AUTHOR_URN não definido)'}`);
    console.log(`  versão da API: ${version}`);

    if (dryRun) {
      console.log('\n[dry-run] Nada foi enviado. Use --publish com as credenciais para publicar.');
      process.exitCode = 0;
    } else {
      if (!token || !author) {
        throw new Error(
          'defina LINKEDIN_ACCESS_TOKEN e LINKEDIN_AUTHOR_URN; sem eles não há publicação',
        );
      }
      let documentUrn = null;
      if (!values['text-only']) {
        console.log('[linkedin] enviando documento...');
        const uploaded = await uploadDocument({
          token,
          owner: author,
          version,
          pdfPath: pdf.path,
        });
        documentUrn = uploaded.documentUrn;
        console.log(`[linkedin] documento pronto: ${documentUrn}`);
      }
      const created = await createPost({
        token,
        author,
        version,
        commentary,
        documentUrn,
        title: post.title || values.post,
      });
      const record = {
        folder: values.post,
        title: post.title,
        postUrn: created.postUrn,
        documentUrn,
        author,
        version,
        publishedAt: new Date().toISOString(),
        campaign: post.meta.campanha ?? null,
      };
      await writeFile(
        join(postDir, 'publicacao.json'),
        `${JSON.stringify(record, null, 2)}\n`,
        'utf8',
      );
      console.log(`\n[linkedin] publicado: ${created.postUrn ?? 'sem URN retornado'}`);
      console.log(`  registro local: ${join(postDir, 'publicacao.json')}`);
    }
  } catch (error) {
    console.error(`[linkedin] Falhou: ${error.message}`);
    process.exitCode = 1;
  }
}
